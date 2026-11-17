import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";

export async function GET(req: Request) {
  return withApi(async () => {
    await requireStaffApi();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const cursor = url.searchParams.get("cursor");
    const rows = await db.post.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { body: { contains: q, mode: "insensitive" } },
                { author: { username: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 31,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        community: { select: { slug: true, name: true } },
        _count: { select: { comments: true, reactions: true, reposts: true } },
      },
    });
    const hasMore = rows.length > 30;
    const page = hasMore ? rows.slice(0, 30) : rows;
    const reportCounts = await db.report.groupBy({
      by: ["targetId"],
      where: { targetType: "POST", targetId: { in: page.map((p) => p.id) } },
      _count: { _all: true },
    });
    const reportMap = new Map(reportCounts.map((r) => [r.targetId, r._count._all]));
    return json({
      posts: page.map((p) => ({
        id: p.id,
        body: p.body,
        type: p.type,
        visibility: p.visibility,
        createdAt: p.createdAt.toISOString(),
        author: {
          username: p.author.username,
          displayName: p.author.profile?.displayName || p.author.username,
          avatarUrl: p.author.profile?.avatarUrl ?? null,
        },
        community: p.community,
        counts: p._count,
        reports: reportMap.get(p.id) ?? 0,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    });
  });
}
