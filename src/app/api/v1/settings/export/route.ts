import { db } from "@/lib/db";
import { withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const [profile, settings, interests, languages, posts, comments, followers, following, communities, messages, reports] =
      await Promise.all([
        db.profile.findUnique({ where: { userId: me.id } }),
        db.userSettings.findUnique({ where: { userId: me.id } }),
        db.userInterest.findMany({ where: { userId: me.id }, select: { name: true } }),
        db.userLanguage.findMany({ where: { userId: me.id }, select: { code: true, proficiency: true } }),
        db.post.findMany({
          where: { authorId: me.id, deletedAt: null },
          select: { id: true, body: true, type: true, createdAt: true, visibility: true },
        }),
        db.comment.findMany({
          where: { authorId: me.id, deletedAt: null },
          select: { id: true, postId: true, body: true, createdAt: true },
        }),
        db.follow.findMany({ where: { followingId: me.id }, select: { follower: { select: { username: true } } } }),
        db.follow.findMany({ where: { followerId: me.id }, select: { following: { select: { username: true } } } }),
        db.communityMember.findMany({
          where: { userId: me.id },
          select: { community: { select: { slug: true, name: true } }, role: true, joinedAt: true },
        }),
        db.message.findMany({
          where: { senderId: me.id, deletedAt: null },
          select: { id: true, body: true, conversationId: true, createdAt: true },
          take: 2000,
        }),
        db.report.findMany({ where: { reporterId: me.id }, select: { targetType: true, reason: true, status: true, createdAt: true } }),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        username: me.username,
        email: me.email,
        dateOfBirth: me.dateOfBirth.toISOString(),
        createdAt: me.createdAt.toISOString(),
        verified: me.verified,
      },
      profile,
      settings,
      interests,
      languages,
      followers,
      following,
      communities,
      posts,
      comments,
      messages,
      reports,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="everlink-export-${me.username}.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
