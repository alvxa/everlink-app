import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { getAdminOverview } from "@/lib/queries";

export async function GET() {
  return withApi(async () => {
    await requireStaffApi();
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [stats, usersSeries, postsSeries, reportSeries, topCountries, topCommunities, topTags] = await Promise.all([
      getAdminOverview(),
      db.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "User" WHERE "createdAt" >= ${since30d} AND "deletedAt" IS NULL GROUP BY 1 ORDER BY 1`,
      db.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Post" WHERE "createdAt" >= ${since30d} AND "deletedAt" IS NULL GROUP BY 1 ORDER BY 1`,
      db.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Report" WHERE "createdAt" >= ${since30d} GROUP BY 1 ORDER BY 1`,
      db.profile.groupBy({
        by: ["countryCode"],
        where: { countryCode: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { countryCode: "desc" } },
        take: 8,
      }),
      db.community.findMany({
        orderBy: { members: { _count: "desc" } },
        take: 6,
        select: { name: true, slug: true, _count: { select: { members: true, posts: true } } },
      }),
      db.hashtag
        .findMany({
          where: { posts: { some: {} } },
          orderBy: { posts: { _count: "desc" } },
          take: 8,
          select: { tag: true, _count: { select: { posts: true } } },
        })
        .then((rows) => rows.map((row) => ({ tag: row.tag, count: row._count.posts }))),
    ]);

    return json({
      stats,
      series: {
        users: usersSeries.map((r) => ({ day: r.day.toISOString(), count: Number(r.count) })),
        posts: postsSeries.map((r) => ({ day: r.day.toISOString(), count: Number(r.count) })),
        reports: reportSeries.map((r) => ({ day: r.day.toISOString(), count: Number(r.count) })),
      },
      topCountries: topCountries.map((c) => ({ code: c.countryCode, members: c._count._all })),
      topCommunities: topCommunities.map((c) => ({
        name: c.name,
        slug: c.slug,
        members: c._count.members,
        posts: c._count.posts,
      })),
      topTags,
    });
  });
}
