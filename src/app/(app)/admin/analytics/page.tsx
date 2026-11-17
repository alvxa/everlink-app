import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getAdminOverview } from "@/lib/queries";
import { InlineStat, BarSeries, StatCard } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { countryName } from "@/lib/countries";
import { flagEmoji } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireStaff();
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

  const series = {
    users: usersSeries.map((row) => ({ day: row.day.toISOString(), count: Number(row.count) })),
    posts: postsSeries.map((row) => ({ day: row.day.toISOString(), count: Number(row.count) })),
    reports: reportSeries.map((row) => ({ day: row.day.toISOString(), count: Number(row.count) })),
  };
  const sum = (points: { count: number }[]) => points.reduce((total, point) => total + point.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="New members (30d)" value={sum(series.users)} />
        <StatCard label="New posts (30d)" value={sum(series.posts)} />
        <StatCard label="Reports (30d)" value={sum(series.reports)} tone={sum(series.reports) > 0 ? "warn" : "good"} />
        <StatCard label="Active (7d)" value={stats.activeUsers} tone="good" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-ink">Signups</h2>
            <Badge variant="outline">30 days</Badge>
          </div>
          <BarSeries series={series.users} color="bg-electric" />
        </section>
        <section className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-ink">Posts</h2>
            <Badge variant="outline">30 days</Badge>
          </div>
          <BarSeries series={series.posts} color="bg-mint" />
        </section>
        <section className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-ink">Reports</h2>
            <Badge variant="outline">30 days</Badge>
          </div>
          <BarSeries series={series.reports} color="bg-red-400" />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-card p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">Top countries</h2>
          <p className="mb-1 text-[11px] text-ink-faint">Members who shared a country on their profile.</p>
          {topCountries.length === 0 && <p className="py-4 text-[12px] text-ink-faint">No country data yet.</p>}
          {topCountries.map((row) => (
            <InlineStat
              key={row.countryCode}
              label={`${flagEmoji(row.countryCode)} ${countryName(row.countryCode) ?? row.countryCode}`}
              value={row._count._all}
            />
          ))}
        </section>

        <section className="surface-card p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">Largest communities</h2>
          <p className="mb-1 text-[11px] text-ink-faint">Ranked by member count.</p>
          {topCommunities.length === 0 && <p className="py-4 text-[12px] text-ink-faint">No communities yet.</p>}
          {topCommunities.map((community) => (
            <InlineStat
              key={community.slug}
              label={
                <Link href={`/communities/${community.slug}`} className="hover:text-brand">
                  {community.name}
                </Link>
              }
              value={`${community._count.members} · ${community._count.posts} posts`}
            />
          ))}
        </section>

        <section className="surface-card p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">Trending hashtags</h2>
          <p className="mb-1 text-[11px] text-ink-faint">Across the entire network.</p>
          {topTags.length === 0 && <p className="py-4 text-[12px] text-ink-faint">No hashtags yet.</p>}
          {topTags.map((tag) => (
            <InlineStat
              key={tag.tag}
              label={
                <Link href={`/explore?hashtag=${encodeURIComponent(tag.tag)}`} className="hover:text-brand">
                  #{tag.tag}
                </Link>
              }
              value={tag.count}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
