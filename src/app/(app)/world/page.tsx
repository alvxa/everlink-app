import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe2, MapPin, MessageSquare, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCommunityList, getFeedPosts, getSuggestedPeople, getWorldOverview } from "@/lib/queries";
import { countryName } from "@/lib/countries";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { CountUp } from "@/components/ui/count-up";
import { PostList } from "@/components/feed/post-list";
import { FollowButton } from "@/components/social/follow-button";
import { WorldMap } from "@/components/world/world-map";
import { JoinCommunityButton } from "@/components/communities/community-actions";
import { flagEmoji } from "@/lib/utils";

export const metadata: Metadata = { title: "World" };
export const dynamic = "force-dynamic";

type Search = { country?: string };

export default async function WorldPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { country: requested } = await searchParams;
  const code = /^[A-Za-z]{2}$/.test(requested ?? "") ? requested!.toUpperCase() : null;

  const overview = await getWorldOverview();
  const totals = {
    members: overview.reduce((sum, row) => sum + row.members, 0),
    posts: overview.reduce((sum, row) => sum + row.posts, 0),
    communities: overview.reduce((sum, row) => sum + row.communities, 0),
    countries: overview.length,
  };
  const maxActivity = Math.max(1, ...overview.map((row) => row.members + row.posts + row.communities));

  const viewer = {
    id: me.id,
    username: me.username,
    displayName: me.profile?.displayName || me.username,
    avatarUrl: me.profile?.avatarUrl ?? null,
  };

  if (!code) {
    return (
      <div className="space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <section className="hero-shell conic-border animate-fade-in">
          <div className="hero-grid" />
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <span className="twinkle left-[54%] top-[18%] h-1 w-1" style={{ animationDelay: "0.4s" }} />
            <span className="twinkle left-[72%] top-[34%] h-1.5 w-1.5" style={{ animationDelay: "1.3s" }} />
            <span className="twinkle left-[86%] top-[66%] h-1 w-1" style={{ animationDelay: "2.1s" }} />
            <span className="twinkle left-[40%] top-[78%] h-1 w-1" style={{ animationDelay: "0.8s" }} />
            <span className="scan-line" />
          </div>
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5 px-5 py-6 sm:px-8 sm:py-7">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-brand dark:border-white/15 dark:bg-white/[0.06] dark:text-brand">
                <Globe2 className="h-3 w-3" /> Global network
              </span>
              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl dark:text-white">World</h1>
              <p className="mt-1.5 max-w-lg text-[13px] leading-6 text-ink-muted dark:text-white/70">
                Cross borders without leaving your feed. Explore communities and people by country.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[11.5px] font-semibold text-ink-muted dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                {totals.countries} {totals.countries === 1 ? "hub" : "hubs"} with activity
              </span>
              <Link
                href="/explore?tab=people"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/80 px-3.5 text-[12px] font-semibold text-ink transition hover:border-brand/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/85 dark:hover:bg-white/[0.1]"
              >
                Discover people <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Countries with hubs" value={totals.countries} icon={<Globe2 className="h-4 w-4" />} />
          <Stat label="Members" value={totals.members} icon={<Users className="h-4 w-4" />} />
          <Stat label="Posts" value={totals.posts} icon={<MessageSquare className="h-4 w-4" />} />
          <Stat label="Communities" value={totals.communities} icon={<MapPin className="h-4 w-4" />} />
        </div>

        <WorldMap countries={overview} />

        <form action="/world" method="get" className="surface-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="icon-tile">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <label htmlFor="world-country" className="block text-[12.5px] font-semibold text-ink">
                Open a country hub
              </label>
              <p className="text-[11px] text-ink-faint">Jump straight to its people, posts and communities.</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <select
              id="world-country"
              name="country"
              className="h-10 flex-1 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-ink outline-none transition focus:border-brand/40 sm:max-w-[260px] dark:border-white/10 dark:bg-white/[0.04]"
              defaultValue=""
            >
              <option value="" disabled>
                Choose a country
              </option>
              {overview.map((row) => (
                <option key={row.code} value={row.code}>
                  {countryName(row.code) ?? row.code}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-xl bg-gradient-to-r from-electric to-ocean px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-14px_rgba(39,153,232,.8)] transition hover:brightness-105 active:scale-[0.98] dark:from-fuchsia-500 dark:via-electric dark:to-ocean"
            >
              Go
            </button>
          </div>
        </form>

        <section>
          <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">Ranked by activity</p>
              <h2 className="mt-0.5 font-display text-[15px] font-semibold text-ink">Most active hubs</h2>
            </div>
            <span className="text-[11px] text-ink-faint">Members and posts</span>
          </div>
          {overview.length === 0 ? (
            <div className="surface-card">
              <EmptyState
                icon={<Globe2 className="h-6 w-6" />}
                title="No country activity yet"
                description="When members set their country and post, hubs will appear here."
              />
            </div>
          ) : (
            <ul className="stagger-list grid gap-2 sm:grid-cols-2" data-reveal>
              {overview.slice(0, 12).map((row, index) => {
                const activity = row.members + row.posts + row.communities;
                const width = Math.max(8, Math.round((activity / maxActivity) * 100));
                return (
                  <li key={row.code}>
                    <Link
                      href={`/world?country=${row.code}`}
                      className="surface-card card-lift glass-sheen group relative flex items-center gap-3.5 overflow-hidden p-3.5"
                    >
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-[26px] leading-none shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                        {flagEmoji(row.code)}
                        <span
                          className={
                            index < 3
                              ? "absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-electric to-ocean text-[10px] font-bold text-white ring-2 ring-surface dark:ring-surface"
                              : "absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface text-[10px] font-bold text-ink-faint ring-2 ring-surface dark:border-white/10 dark:bg-surface-3"
                          }
                        >
                          {index + 1}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink transition group-hover:text-brand">
                          {countryName(row.code) ?? row.code}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-faint">
                          {countLabel(row.members, "member")} · {countLabel(row.posts, "post")} ·{" "}
                          {countLabel(row.communities, "community", "communities")}
                        </p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-3 dark:bg-white/[0.08]">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-electric to-ocean dark:from-fuchsia-400 dark:via-electric-soft dark:to-cyan-300"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const stat = overview.find((row) => row.code === code) ?? { code, members: 0, posts: 0, communities: 0 };
  const [posts, communities, people] = await Promise.all([
    getFeedPosts({ viewerId: me.id, countryCode: code, limit: 10 }),
    getCommunityList({ country: code, viewerId: me.id, limit: 8 }),
    getSuggestedPeople({ country: code, viewerId: me.id, limit: 8, sort: "popular" }),
  ]);
  const following = people.length
    ? await db.follow.findMany({
        where: { followerId: me.id, followingId: { in: people.map((person) => person.id) } },
        select: { followingId: true },
      })
    : [];
  const followingIds = new Set(following.map((row) => row.followingId));

  return (
    <div className="space-y-4 px-4 pb-6 pt-5 sm:px-6">
      <Link href="/world" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All countries
      </Link>

      <section className="hub-banner animate-fade-in">
        <div className="relative z-10 flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-line bg-surface text-[40px] leading-none shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            {flagEmoji(code)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand dark:text-brand">Country hub</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {countryName(code) ?? code}
            </h1>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="neon-chip">
                <Users className="h-3 w-3" /> {countLabel(stat.members, "member")}
              </span>
              <span className="neon-chip">
                <MessageSquare className="h-3 w-3" /> {countLabel(stat.posts, "post")}
              </span>
              <span className="neon-chip">
                <MapPin className="h-3 w-3" /> {countLabel(stat.communities, "community", "communities")}
              </span>
            </div>
          </div>
          <Link
            href="/explore?tab=people"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/80 px-3.5 text-[12px] font-semibold text-ink transition hover:border-brand/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/85 dark:hover:bg-white/[0.1]"
          >
            Discover more people <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <WorldMap countries={overview} active={code} />

      {people.length > 0 && (
        <section className="surface-card p-4">
          <div className="flex items-center gap-2.5">
            <span className="icon-tile">
              <Users className="h-4 w-4" />
            </span>
            <h2 className="panel-title">People from {countryName(code) ?? code}</h2>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5 transition hover:border-brand/30 dark:border-white/[0.07] dark:bg-white/[0.03]"
              >
                <Avatar src={person.avatarUrl} name={person.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${person.username}`} className="block truncate text-[13px] font-semibold text-ink hover:text-brand">
                    {person.displayName}
                  </Link>
                  <p className="truncate text-[11px] text-ink-faint">
                    @{person.username} · {person.followers} followers
                  </p>
                </div>
                <FollowButton username={person.username} initialFollowing={followingIds.has(person.id)} isSelf={person.id === me.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {communities.length > 0 && (
        <section className="surface-card p-4">
          <div className="flex items-center gap-2.5">
            <span className="icon-tile">
              <MapPin className="h-4 w-4" />
            </span>
            <h2 className="panel-title">Communities in {countryName(code) ?? code}</h2>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {communities.map((community) => (
              <li
                key={community.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5 transition hover:border-brand/30 dark:border-white/[0.07] dark:bg-white/[0.03]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3 text-ink-muted">
                  {community.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={community.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/communities/${community.slug}`} className="block truncate text-[13px] font-semibold text-ink hover:text-brand">
                    {community.name}
                  </Link>
                  <p className="text-[11px] text-ink-faint">
                    {community.memberCount} members · {community.type.toLowerCase()}
                  </p>
                </div>
                <JoinCommunityButton slug={community.slug} type={community.type} viewerRole={community.viewerRole} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">Country feed</p>
            <h2 className="mt-0.5 font-display text-[15px] font-semibold text-ink">Posts from {countryName(code) ?? code}</h2>
          </div>
        </div>
        {posts.items.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title="No public posts from this country yet"
              description="Be the first to share something with this hub."
            />
          </div>
        ) : (
          <PostList posts={posts.items} viewer={viewer} />
        )}
      </section>
    </div>
  );
}

function countLabel(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="stat-tile">
      <div className="relative flex items-center gap-2 text-[11.5px] font-medium text-ink-faint">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-white/[0.06] dark:text-brand">{icon}</span>
        {label}
      </div>
      <p className="relative mt-2 font-display text-2xl font-bold tracking-tight text-ink">
        <CountUp value={value} />
      </p>
    </div>
  );
}
