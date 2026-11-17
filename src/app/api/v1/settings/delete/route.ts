import { db } from "@/lib/db";
import { badRequest, guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { destroyCurrentSession, hashPassword, verifyPassword } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(1),
  confirm: z.literal("DELETE"),
});

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "settings:delete-account", 5, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await req.json().then((body) => schema.parse(body));

    if (!(await verifyPassword(me.passwordHash, input.password))) {
      throw badRequest("Password is incorrect.", { password: ["Password is incorrect."] });
    }

    const tombstone = `deleted_${me.id.slice(-10)}`;
    await db.$transaction([
      db.user.update({
        where: { id: me.id },
        data: {
          status: "DEACTIVATED",
          deletedAt: new Date(),
          email: `${tombstone}@deleted.everlink.invalid`,
          username: tombstone,
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
          suspendedReason: "Account deleted by the owner.",
        },
      }),
      db.session.deleteMany({ where: { userId: me.id } }),
      db.post.updateMany({ where: { authorId: me.id }, data: { deletedAt: new Date() } }),
      db.comment.updateMany({ where: { authorId: me.id }, data: { deletedAt: new Date() } }),
      db.story.updateMany({ where: { authorId: me.id }, data: { deletedAt: new Date() } }),
      db.conversationMember.updateMany({ where: { userId: me.id }, data: { leftAt: new Date() } }),
      db.communityMember.deleteMany({ where: { userId: me.id } }),
      db.follow.deleteMany({ where: { OR: [{ followerId: me.id }, { followingId: me.id }] } }),
      db.friendship.deleteMany({ where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] } }),
      db.bookmark.deleteMany({ where: { userId: me.id } }),
      db.reaction.deleteMany({ where: { userId: me.id } }),
      db.auditLog.create({
        data: { actorId: me.id, action: "account.delete", targetType: "USER", targetId: me.id },
      }),
    ]);

    await destroyCurrentSession();
    return json({ ok: true });
  });
}
