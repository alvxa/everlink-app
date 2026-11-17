import { db } from "@/lib/db";
import { badRequest, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const inviteSchema = z.object({ username: z.string().trim().min(1).max(24) });

export async function POST(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "community:invite", 30, 60 * 60 * 1000);
    const { slug } = await params;
    const me = await requireApiUser();
    const community = await db.community.findFirst({
      where: { slug, suspendedAt: null },
      select: { id: true, name: true },
    });
    if (!community) throw notFound("That community does not exist.");
    const membership = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: me.id } },
    });
    if (!membership) throw badRequest("Only members can invite people.");

    const { username } = inviteSchema.parse(await req.json());
    const invitee = await db.user.findFirst({
      where: { username: username.toLowerCase(), status: "ACTIVE", deletedAt: null },
      select: { id: true, settings: { select: { allowGroupInvites: true } } },
    });
    if (!invitee) throw notFound("That person does not exist.");
    if (invitee.id === me.id) throw badRequest("You are already here.");

    if (invitee.settings?.allowGroupInvites === false) {
      throw badRequest("This person is not accepting community invitations.");
    }
    const existingMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: invitee.id } },
    });
    if (existingMember) throw badRequest("They are already a member.");

    const invitation = await db.communityInvitation.upsert({
      where: { communityId_inviteeId: { communityId: community.id, inviteeId: invitee.id } },
      create: { communityId: community.id, inviterId: me.id, inviteeId: invitee.id },
      update: { inviterId: me.id, status: "PENDING" },
    });

    await createNotification({
      userId: invitee.id,
      type: "COMMUNITY_INVITE",
      actorId: me.id,
      title: `${me.profile?.displayName || me.username} invited you to ${community.name}`,
      link: `/communities/${slug}`,
      entityType: "COMMUNITY",
      entityId: community.id,
      dedupeKey: `community-invite:${invitation.id}`,
    });
    return json({ ok: true, invitationId: invitation.id });
  });
}
