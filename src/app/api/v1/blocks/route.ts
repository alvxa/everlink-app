import { db } from "@/lib/db";
import { badRequest, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { z } from "zod";

const schema = z.object({ username: z.string().trim().min(1).max(24) });

async function targetUser(username: string) {
  const user = await db.user.findFirst({
    where: { username: username.toLowerCase(), deletedAt: null },
    select: { id: true, username: true },
  });
  if (!user) throw notFound("That account does not exist.");
  return user;
}

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const rows = await db.block.findMany({
      where: { blockerId: me.id },
      orderBy: { createdAt: "desc" },
      include: { blocked: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
    });
    return json({
      blocks: rows.map((row) => ({
        id: row.id,
        username: row.blocked.username,
        displayName: row.blocked.profile?.displayName || row.blocked.username,
        avatarUrl: row.blocked.profile?.avatarUrl ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "block", 40, 60 * 60 * 1000);
    const me = await requireApiUser();
    const { username } = schema.parse(await req.json());
    const target = await targetUser(username);
    if (target.id === me.id) throw badRequest("You cannot block yourself.");

    await db.$transaction([
      db.block.upsert({
        where: { blockerId_blockedId: { blockerId: me.id, blockedId: target.id } },
        create: { blockerId: me.id, blockedId: target.id },
        update: {},
      }),
      db.follow.deleteMany({
        where: {
          OR: [
            { followerId: me.id, followingId: target.id },
            { followerId: target.id, followingId: me.id },
          ],
        },
      }),
      db.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: me.id, addresseeId: target.id },
            { requesterId: target.id, addresseeId: me.id },
          ],
        },
      }),
    ]);
    return json({ blocked: true });
  });
}

export async function DELETE(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const { username } = schema.parse(await req.json());
    const target = await targetUser(username);
    await db.block.deleteMany({ where: { blockerId: me.id, blockedId: target.id } });
    return json({ blocked: false });
  });
}
