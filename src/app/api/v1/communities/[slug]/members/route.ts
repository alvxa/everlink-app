import { db } from "@/lib/db";
import { badRequest, forbidden, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { authorSelect, mapAuthor } from "@/lib/queries";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

async function requireRole(slug: string, userId: string) {
  const community = await db.community.findFirst({
    where: { slug },
    select: { id: true, ownerId: true, name: true },
  });
  if (!community) throw notFound("That community does not exist.");
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId: community.id, userId } },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    throw forbidden("Only community owners and admins can manage members.");
  }
  return { community, member };
}

export async function GET(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const community = await db.community.findFirst({ where: { slug }, select: { id: true } });
    if (!community) throw notFound("That community does not exist.");
    const members = await db.communityMember.findMany({
      where: { communityId: community.id },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take: 100,
      include: { user: { select: authorSelect } },
    });
    return json({ members: members.map((m) => ({ ...mapAuthor(m.user), role: m.role, joinedAt: m.joinedAt.toISOString() })) });
  });
}

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const me = await requireApiUser();
    const { community } = await requireRole(slug, me.id);
    const input = roleSchema.parse(await req.json());
    if (input.userId === community.ownerId) throw badRequest("The owner's role cannot be changed.");
    const target = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: input.userId } },
    });
    if (!target) throw notFound("That person is not a member.");
    await db.communityMember.update({ where: { id: target.id }, data: { role: input.role } });
    if (input.role !== "MEMBER") {
      await createNotification({
        userId: input.userId,
        type: "SYSTEM",
        actorId: me.id,
        title: `You are now a ${input.role.toLowerCase()} of ${community.name}`,
        link: `/communities/${slug}`,
        entityType: "COMMUNITY",
        entityId: community.id,
        dedupeKey: `community-role:${community.id}:${input.userId}:${input.role}`,
      });
    }
    return json({ ok: true });
  });
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function DELETE(req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const me = await requireApiUser();
    const { community } = await requireRole(slug, me.id);
    const input = removeSchema.parse(await req.json());
    if (input.userId === community.ownerId) throw badRequest("The owner cannot be removed.");
    const target = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: input.userId } },
    });
    if (!target) throw notFound("That person is not a member.");
    if (target.role === "ADMIN" && me.id !== community.ownerId) {
      throw forbidden("Only the owner can remove an admin.");
    }
    await db.communityMember.delete({ where: { id: target.id } });
    return json({ ok: true });
  });
}
