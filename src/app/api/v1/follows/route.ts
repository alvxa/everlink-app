import { db } from "@/lib/db";
import { badRequest, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getCurrentUser } from "@/lib/auth";
import { mapAuthor, authorSelect } from "@/lib/queries";
import { z } from "zod";

const schema = z.object({ username: z.string().trim().min(1).max(24) });

async function targetUser(username: string) {
  const user = await db.user.findFirst({
    where: { username: username.toLowerCase(), status: "ACTIVE", deletedAt: null },
    select: { id: true, username: true },
  });
  if (!user) throw notFound("That person does not exist.");
  return user;
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "follow", 80, 60 * 60 * 1000);
    const me = await requireApiUser();
    const { username } = schema.parse(await req.json());
    const target = await targetUser(username);
    if (target.id === me.id) throw badRequest("You cannot follow yourself.");

    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: me.id, blockedId: target.id },
          { blockerId: target.id, blockedId: me.id },
        ],
      },
    });
    if (blocked) throw badRequest("This account is not available.");

    await db.follow.upsert({
      where: { followerId_followingId: { followerId: me.id, followingId: target.id } },
      create: { followerId: me.id, followingId: target.id },
      update: {},
    });

    const { createNotification } = await import("@/lib/notifications");
    await createNotification({
      userId: target.id,
      type: "FOLLOW",
      actorId: me.id,
      title: `${me.profile?.displayName || me.username} started following you`,
      link: `/profile/${me.username}`,
      entityType: "USER",
      entityId: me.id,
      dedupeKey: `follow:${me.id}:${target.id}`,
    });
    return json({ following: true });
  });
}

export async function DELETE(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const { username } = schema.parse(await req.json());
    const target = await targetUser(username);
    await db.follow.deleteMany({ where: { followerId: me.id, followingId: target.id } });
    return json({ following: false });
  });
}

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    const type = url.searchParams.get("type") === "followers" ? "followers" : "following";
    if (!username) throw badRequest("A username is required.");
    const user = await targetUser(username);
    const viewer = await getCurrentUser();

    const rows = await db.follow.findMany({
      where: type === "followers" ? { followingId: user.id } : { followerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        follower: { select: authorSelect },
        following: { select: authorSelect },
      },
    });
    const people = rows.map((row) => mapAuthor(type === "followers" ? row.follower : row.following));

    const followed = viewer
      ? new Set(
          (
            await db.follow.findMany({
              where: { followerId: viewer.id, followingId: { in: people.map((p) => p.id) } },
              select: { followingId: true },
            })
          ).map((f) => f.followingId)
        )
      : new Set<string>();

    return json({ people: people.map((p) => ({ ...p, isFollowing: followed.has(p.id) })) });
  });
}
