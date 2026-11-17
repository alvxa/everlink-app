import "server-only";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/api";
import { assertUploadOwnership } from "@/lib/storage";
import { emitToConversation, emitToUser } from "@/lib/realtime";
import { authorSelect, mapAuthor } from "@/lib/queries";
import type { SessionUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import type { z } from "zod";
import { conversationSchema, messageSchema } from "@/lib/validation";

type CreateConversationInput = z.infer<typeof conversationSchema>;
type MessageInput = z.infer<typeof messageSchema>;

async function blockedBetween(a: string, b: string) {
  return db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
}

async function areFriends(a: string, b: string) {
  const friendship = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
  return Boolean(friendship);
}

export async function findOrCreateDirect(me: SessionUser, targetId: string): Promise<string> {
  if (targetId === me.id) throw badRequest("You cannot message yourself.");
  const target = await db.user.findFirst({
    where: { id: targetId, status: "ACTIVE", deletedAt: null },
    select: { id: true, username: true, settings: { select: { messagePrivacy: true } } },
  });
  if (!target) throw notFound("That account is not available.");
  if (await blockedBetween(me.id, target.id)) throw forbidden("This conversation is not available.");

  if (target.settings?.messagePrivacy === "FRIENDS" && !(await areFriends(me.id, target.id))) {
    throw forbidden("This person only accepts messages from friends.");
  }

  const existing = await db.conversation.findFirst({
    where: {
      type: "DIRECT",
      members: { some: { userId: me.id, leftAt: null } },
      AND: [{ members: { some: { userId: target.id, leftAt: null } } }],
    },
    include: { members: { select: { userId: true } } },
  });
  if (existing && existing.members.length === 2) return existing.id;

  const created = await db.conversation.create({
    data: {
      type: "DIRECT",
      createdById: me.id,
      members: { create: [{ userId: me.id }, { userId: target.id }] },
    },
    select: { id: true },
  });
  return created.id;
}

export async function createConversation(me: SessionUser, input: CreateConversationInput) {
  const ids = new Set(input.memberIds.filter(Boolean));
  if (input.usernames.length) {
    const users = await db.user.findMany({
      where: { username: { in: input.usernames }, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    if (users.length !== input.usernames.length) {
      throw badRequest("One or more usernames could not be found.", {
        usernames: ["One or more usernames could not be found."],
      });
    }
    for (const user of users) ids.add(user.id);
  }
  ids.delete(me.id);

  if (input.type === "DIRECT") {
    if (ids.size !== 1) throw badRequest("Choose exactly one person for a direct conversation.");
    const conversationId = await findOrCreateDirect(me, [...ids][0]!);
    return conversationId;
  }

  if (ids.size < 2) throw badRequest("Group conversations need at least two other members.");
  const others = await db.user.findMany({
    where: { id: { in: [...ids] }, status: "ACTIVE", deletedAt: null },
    select: { id: true, username: true },
  });
  if (others.length !== ids.size) throw badRequest("One or more members could not be found.");

  for (const other of others) {
    if (await blockedBetween(me.id, other.id)) {
      throw forbidden(`You cannot add @${other.username} to a conversation.`);
    }
  }

  const created = await db.conversation.create({
    data: {
      type: "GROUP",
      createdById: me.id,
      title: input.title?.trim() || "New group",
      members: { create: [{ userId: me.id }, ...others.map((o) => ({ userId: o.id }))] },
    },
    select: { id: true },
  });
  for (const other of others) {
    emitToUser(other.id, "conversation:new", { conversationId: created.id });
  }
  return created.id;
}

export async function assertMembership(conversationId: string, userId: string) {
  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        include: {
          members: { where: { leftAt: null }, select: { userId: true } },
        },
      },
    },
  });
  if (!membership || membership.leftAt) throw notFound("That conversation is not available.");
  return membership;
}

export async function sendMessage(me: SessionUser, conversationId: string, input: MessageInput) {
  const membership = await assertMembership(conversationId, me.id);
  const otherIds = membership.conversation.members.map((m) => m.userId).filter((id) => id !== me.id);
  if (otherIds.length === 0) throw badRequest("This conversation has no other members.");

  for (const otherId of otherIds) {
    if (await blockedBetween(me.id, otherId)) throw forbidden("This conversation is not available.");
  }

  if (input.replyToId) {
    const reply = await db.message.findFirst({
      where: { id: input.replyToId, conversationId, deletedAt: null },
      select: { id: true },
    });
    if (!reply) throw badRequest("The message you replied to no longer exists.");
  }

  const attachmentUrls = input.attachments.map((a) => a.url);
  await assertUploadOwnership(me.id, attachmentUrls, "MESSAGE");

  const message = await db.message.create({
    data: {
      conversationId,
      senderId: me.id,
      body: input.body,
      replyToId: input.replyToId ?? null,
      attachments: {
        create: input.attachments.map((a) => ({
          url: a.url,
          kind: a.kind,
          mime: a.mime,
          size: a.size,
          name: a.name ?? null,
          duration: a.duration ?? null,
        })),
      },
    },
    include: {
      sender: { select: authorSelect },
      attachments: true,
      replyTo: { select: { id: true, body: true, sender: { select: authorSelect } } },
    },
  });

  await db.$transaction([
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    db.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: me.id } },
      data: { lastReadAt: new Date(), archived: false },
    }),
  ]);

  const dto = {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    editedAt: null,
    sender: mapAuthor(message.sender),
    attachments: message.attachments,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          body: message.replyTo.body,
          senderName: mapAuthor(message.replyTo.sender).displayName,
        }
      : null,
  };

  emitToConversation(conversationId, "message:new", dto);

  const displayName = me.profile?.displayName || me.username;
  for (const recipientId of otherIds) {
    await createNotification({
      userId: recipientId,
      type: "MESSAGE",
      actorId: me.id,
      title: `New message from ${displayName}`,
      body: (input.body || input.attachments[0]?.name || "Attachment").slice(0, 120),
      link: `/messages/${conversationId}`,
      entityType: "MESSAGE",
      entityId: message.id,
      dedupeKey: `message:${message.id}`,
    });
    emitToUser(recipientId, "conversation:updated", { conversationId });
  }

  return dto;
}

export async function updateConversation(
  me: SessionUser,
  conversationId: string,
  input: { archived?: boolean; muted?: boolean; title?: string }
) {
  const membership = await assertMembership(conversationId, me.id);
  await db.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: me.id } },
    data: {
      archived: input.archived ?? undefined,
      muted: input.muted ?? undefined,
    },
  });
  if (input.title && membership.conversation.type === "GROUP") {
    const isOwnerOrAdmin = membership.conversation.createdById === me.id;
    if (!isOwnerOrAdmin) throw forbidden("Only the group creator can rename this conversation.");
    await db.conversation.update({ where: { id: conversationId }, data: { title: input.title.slice(0, 80) } });
  }
  return { ok: true };
}

export async function leaveConversation(me: SessionUser, conversationId: string) {
  await assertMembership(conversationId, me.id);
  await db.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: me.id } },
    data: { leftAt: new Date() },
  });
  return { ok: true };
}

export async function markRead(me: SessionUser, conversationId: string) {
  await assertMembership(conversationId, me.id);
  const at = new Date();
  await db.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: me.id } },
    data: { lastReadAt: at },
  });
  emitToConversation(conversationId, "message:read", {
    conversationId,
    userId: me.id,
    at: at.toISOString(),
  });
  return { ok: true, at: at.toISOString() };
}
