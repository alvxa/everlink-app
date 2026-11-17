import { db } from "@/lib/db";
import { badRequest, conflict, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { createNotification } from "@/lib/notifications";
import { authorSelect, mapAuthor } from "@/lib/queries";
import { z } from "zod";

const requestSchema = z.object({ username: z.string().trim().min(1).max(24) });
const actionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["ACCEPT", "DECLINE", "CANCEL", "REMOVE"]),
});

export async function GET(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "incoming";

    const where =
      type === "outgoing"
        ? { requesterId: me.id }
        : type === "accepted"
          ? { status: "ACCEPTED" as const, OR: [{ requesterId: me.id }, { addresseeId: me.id }] }
          : { addresseeId: me.id, status: "PENDING" as const };

    const rows = await db.friendship.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { requester: { select: authorSelect }, addressee: { select: authorSelect } },
    });

    return json({
      requests: rows.map((row) => {
        const other = row.requesterId === me.id ? mapAuthor(row.addressee) : mapAuthor(row.requester);
        return {
          id: row.id,
          status: row.status,
          direction: row.requesterId === me.id ? "outgoing" : "incoming",
          createdAt: row.createdAt.toISOString(),
          user: other,
        };
      }),
    });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "friend:request", 40, 60 * 60 * 1000);
    const me = await requireApiUser();
    const { username } = requestSchema.parse(await req.json());
    const target = await db.user.findFirst({
      where: { username: username.toLowerCase(), status: "ACTIVE", deletedAt: null },
      select: { id: true, username: true },
    });
    if (!target) throw notFound("That person does not exist.");
    if (target.id === me.id) throw badRequest("You cannot add yourself.");

    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: me.id, blockedId: target.id },
          { blockerId: target.id, blockedId: me.id },
        ],
      },
    });
    if (blocked) throw badRequest("This account is not available.");

    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: me.id, addresseeId: target.id },
          { requesterId: target.id, addresseeId: me.id },
        ],
      },
    });
    if (existing?.status === "ACCEPTED") throw conflict("You are already friends.");
    if (existing?.status === "PENDING") {
      if (existing.requesterId === target.id) {
        await db.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
        await createNotification({
          userId: target.id,
          type: "FRIEND_ACCEPT",
          actorId: me.id,
          title: `${me.profile?.displayName || me.username} accepted your friend request`,
          link: `/profile/${me.username}`,
          entityType: "USER",
          entityId: me.id,
          dedupeKey: `friend-accept:${existing.id}`,
        });
        return json({ status: "ACCEPTED" });
      }
      throw conflict("You already sent a friend request.");
    }
    if (existing) {
      await db.friendship.update({
        where: { id: existing.id },
        data: { requesterId: me.id, addresseeId: target.id, status: "PENDING" },
      });
    } else {
      await db.friendship.create({ data: { requesterId: me.id, addresseeId: target.id } });
    }
    await createNotification({
      userId: target.id,
      type: "FRIEND_REQUEST",
      actorId: me.id,
      title: `${me.profile?.displayName || me.username} sent you a friend request`,
      link: `/profile/${me.username}`,
      entityType: "USER",
      entityId: me.id,
      dedupeKey: `friend-request:${me.id}:${target.id}`,
    });
    return json({ status: "PENDING" });
  });
}

export async function PATCH(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const { requestId, action } = actionSchema.parse(await req.json());
    const friendship = await db.friendship.findUnique({
      where: { id: requestId },
      include: { requester: { select: authorSelect } },
    });
    if (!friendship) throw notFound("That friend request no longer exists.");
    if (friendship.requesterId !== me.id && friendship.addresseeId !== me.id) {
      throw badRequest("That request does not involve you.");
    }

    if (action === "CANCEL") {
      if (friendship.requesterId !== me.id) throw badRequest("Only the sender can cancel this request.");
      await db.friendship.delete({ where: { id: requestId } });
      return json({ status: "CANCELLED" });
    }
    if (action === "REMOVE") {
      await db.friendship.delete({ where: { id: requestId } });
      return json({ status: "REMOVED" });
    }
    if (friendship.addresseeId !== me.id) throw badRequest("Only the recipient can respond to this request.");
    if (action === "ACCEPT") {
      await db.friendship.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
      await createNotification({
        userId: friendship.requesterId,
        type: "FRIEND_ACCEPT",
        actorId: me.id,
        title: `${me.profile?.displayName || me.username} accepted your friend request`,
        link: `/profile/${me.username}`,
        entityType: "USER",
        entityId: me.id,
        dedupeKey: `friend-accept:${requestId}`,
      });
      return json({ status: "ACCEPTED" });
    }
    await db.friendship.update({ where: { id: requestId }, data: { status: "DECLINED" } });
    return json({ status: "DECLINED" });
  });
}
