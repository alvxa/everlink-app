import { db } from "@/lib/db";
import { forbidden, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const me = await requireApiUser();
    const community = await db.community.findFirst({
      where: { slug, suspendedAt: null },
      select: { id: true, type: true, ownerId: true, name: true },
    });
    if (!community) throw notFound("That community does not exist.");

    if (community.type === "PRIVATE") {
      return json({ requiresInvite: true, joined: false });
    }
    if (community.type === "RESTRICTED") {
      const existing = await db.communityInvitation.findUnique({
        where: { communityId_inviteeId: { communityId: community.id, inviteeId: me.id } },
      });
      if (existing) return json({ pending: true, joined: false });
      const invitation = await db.communityInvitation.create({
        data: { communityId: community.id, inviterId: me.id, inviteeId: me.id, status: "REQUESTED" },
      });
      const { createNotification } = await import("@/lib/notifications");
      await createNotification({
        userId: community.ownerId,
        type: "COMMUNITY_INVITE",
        actorId: me.id,
        title: `${me.profile?.displayName || me.username} requested to join ${community.name}`,
        link: `/communities/${slug}`,
        entityType: "COMMUNITY",
        entityId: community.id,
        dedupeKey: `join-request:${invitation.id}`,
      });
      return json({ requested: true, joined: false });
    }

    await db.communityMember.upsert({
      where: { communityId_userId: { communityId: community.id, userId: me.id } },
      create: { communityId: community.id, userId: me.id },
      update: {},
    });
    return json({ joined: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const me = await requireApiUser();
    const community = await db.community.findFirst({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!community) throw notFound("That community does not exist.");
    if (community.ownerId === me.id) throw forbidden("Owners cannot leave their own community. Transfer ownership or delete it first.");
    await db.communityMember.deleteMany({ where: { communityId: community.id, userId: me.id } });
    return json({ joined: false });
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(3).max(60).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  type: z.enum(["PUBLIC", "PRIVATE", "RESTRICTED"]).optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  coverUrl: z.string().max(500).nullable().optional(),
  guidelines: z.string().max(5000).optional(),
  countryCode: z.string().length(2).toUpperCase().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "community:update", 30, 60 * 60 * 1000);
    const { slug } = await params;
    const me = await requireApiUser();
    const member = await db.communityMember.findFirst({
      where: { userId: me.id, community: { slug } },
      include: { community: { select: { id: true } } },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      throw forbidden("Only community owners and admins can edit this community.");
    }
    const input = patchSchema.parse(await req.json());
    const community = await db.community.update({ where: { id: member.community.id }, data: input });
    await db.auditLog.create({
      data: { actorId: me.id, action: "community.update", targetType: "COMMUNITY", targetId: community.id },
    });
    return json({ community });
  });
}

export async function GET(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const community = await db.community.findFirst({
      where: { slug },
      include: {
        owner: { select: { username: true, profile: { select: { displayName: true } } } },
        _count: { select: { members: true, posts: { where: { deletedAt: null } } } },
      },
    });
    if (!community) throw notFound("That community does not exist.");
    return json({ community });
  });
}
