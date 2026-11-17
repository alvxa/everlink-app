import { db } from "@/lib/db";
import { guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  invitationId: z.string().min(1),
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const invitations = await db.communityInvitation.findMany({
      where: { inviteeId: me.id, status: { in: ["PENDING", "REQUESTED"] } },
      orderBy: { createdAt: "desc" },
      include: {
        community: { select: { slug: true, name: true, imageUrl: true, type: true } },
        inviter: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
    return json({ invitations });
  });
}

export async function PATCH(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const input = schema.parse(await req.json());
    const invitation = await db.communityInvitation.findUnique({
      where: { id: input.invitationId },
      include: { community: { select: { id: true, name: true, slug: true, ownerId: true } } },
    });
    if (!invitation) throw notFound("That invitation no longer exists.");

    const isRequest = invitation.status === "REQUESTED" && invitation.inviterId === invitation.inviteeId;
    if (isRequest) {
      const owner = await db.communityMember.findFirst({
        where: { communityId: invitation.communityId, userId: me.id, role: { in: ["OWNER", "ADMIN"] } },
      });
      if (!owner) return json({ error: { code: "FORBIDDEN", message: "Only community admins can review join requests." } }, { status: 403 });
      if (input.action === "ACCEPT") {
        await db.$transaction([
          db.communityInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } }),
          db.communityMember.upsert({
            where: { communityId_userId: { communityId: invitation.communityId, userId: invitation.inviteeId } },
            create: { communityId: invitation.communityId, userId: invitation.inviteeId },
            update: {},
          }),
        ]);
        await createNotification({
          userId: invitation.inviteeId,
          type: "COMMUNITY_INVITE",
          actorId: me.id,
          title: `You joined ${invitation.community.name}`,
          link: `/communities/${invitation.community.slug}`,
          entityType: "COMMUNITY",
          entityId: invitation.communityId,
          dedupeKey: `join-accepted:${invitation.id}`,
        });
      } else {
        await db.communityInvitation.update({ where: { id: invitation.id }, data: { status: "DECLINED" } });
      }
      return json({ ok: true });
    }

    if (invitation.inviteeId !== me.id) {
      return json({ error: { code: "FORBIDDEN", message: "That invitation is not yours." } }, { status: 403 });
    }
    if (input.action === "ACCEPT") {
      await db.$transaction([
        db.communityInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } }),
        db.communityMember.upsert({
          where: { communityId_userId: { communityId: invitation.communityId, userId: me.id } },
          create: { communityId: invitation.communityId, userId: me.id },
          update: {},
        }),
      ]);
    } else {
      await db.communityInvitation.update({ where: { id: invitation.id }, data: { status: "DECLINED" } });
    }
    return json({ ok: true });
  });
}
