import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Compass, Hash, MapPin, Search, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getCommunityList,
  getFeedPosts,
  getSuggestedPeople,
  getTrendingHashtags,
  globalSearch,
} from "@/lib/queries";
import { countryName } from "@/lib/countries";
import { LANGUAGE_MAP } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { PostList } from "@/components/feed/post-list";
import { FollowButton } from "@/components/social/follow-button";
import { ExploreFilters } from "@/components/explore/explore-filters";
import { cn, flagEmoji, formatCount } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  tab?: string;
  interest?: string;
  language?: string;
  country?: string;
  sort?: string;
  hashtag?: string;
};

const TABS = [
  { key: "people", label: "People", icon: Users },
  { key: "posts", label: "Posts", icon: Compass },
  { key: "communities", label: "Communities", icon: Users },
  { key: "hashtags", label: "Hashtags", icon: Hash },
] as const;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const hashtag = (params.hashtag ?? "").trim().replace(/^#/, "");
  const tab = (["people", "posts", "communities", "hashtags"] as const).includes(params.tab as never)
    ? (params.tab as (typeof TABS)[number]["key"])
    : "people";

  const viewer = {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName || user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };

  const [people, posts, communities, hashtags, globalResults] = await Promise.all([
    getSuggestedPeople({
      viewerId: user.id,
      q: q || undefined,
      interest: params.interest,
      language: params.language,
      country: params.country,
      sort: (params.sort as "popular" | "new" | "recent" | undefined) ?? "popular",
      limit: 24,
    }),
    getFeedPosts({
      viewerId: user.id,
      limit: 10,
      search: q || undefined,
      hashtag: hashtag || undefined,
    }),
    getCommunityList({ search: q || undefined, viewerId: user.id, limit: 12 }),
    getTrendingHashtags(20),
    q.length >= 2 ? globalSearch(q, user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4 px-4 pb-8 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="icon-tile h-10 w-10 rounded-2xl">
          <Compass className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink">Explore</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">Find people, cultures and conversations across the world.</p>
        </div>
      </div>

      <form action="/explore" method="get" className="flex items-center gap-2 rounded-2xl border border-electric/25 bg-surface/80 px-3 shadow-[0_18px_50px_-40px_rgba(139,92,246,1)] transition focus-within:border-electric/60 focus-within:shadow-[0_0_34px_-16px_rgba(139,92,246,.9)]">
        <Search className="h-4 w-4 shrink-0 text-ink-faint" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search people, posts, communities or #hashtags"
          className="h-11 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
        />
        <button type="submit" className="rounded-xl bg-gradient-to-r from-electric to-ocean px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_8px_22px_-12px_rgba(139,92,246,.9)]">
          Search
        </button>
      </form>

      <div className="surface-card hide-scrollbar flex gap-1 overflow-x-auto p-1.5">
        {TABS.map((item) => {
          const target = new URLSearchParams();
          if (q) target.set("q", q);
          if (item.key !== "people") target.set("tab", item.key);
          return (
            <Link
              key={item.key}
              href={`/explore${target.toString() ? `?${target.toString()}` : ""}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition",
                tab === item.key
                  ? "bg-gradient-to-r from-fuchsia-500 via-electric to-ocean text-white shadow-[0_10px_28px_-14px_rgba(139,92,246,1)] ring-1 ring-inset ring-white/20"
                  : "text-ink-muted hover:bg-surface-3 hover:text-ink"
              )}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </Link>
          );
        })}
      </div>

      {(tab === "people" || tab === "communities") && (
        <ExploreFilters
          q={q}
          interest={params.interest}
          language={params.language}
          country={params.country}
          sort={params.sort}
        />
      )}

      {hashtag && (
        <div className="flex items-center gap-2 rounded-2xl border border-brand/20 bg-brand-soft/50 px-4 py-3 text-[13px] text-brand">
          <Hash className="h-4 w-4" /> Showing posts tagged #{hashtag}
          <Link href="/explore" className="ml-auto text-[12px] font-semibold hover:underline">
            Clear
          </Link>
        </div>
      )}

      {q && globalResults && tab === "people" && (
        <p className="text-[12.5px] text-ink-muted">
          {globalResults.people.length + globalResults.posts.length + globalResults.communities.length} results for &ldquo;{q}&rdquo;
        </p>
      )}

      {tab === "people" && (
        people.length === 0 ? (
          <div className="surface-card">
            <EmptyState icon={<Users className="h-6 w-6" />} title="No people found" description="Try a different name, interest or country." />
          </div>
        ) : (
          <div className="stagger-list grid gap-3 sm:grid-cols-2" data-reveal>
            {people.map((person) => (
              <div key={person.id} className="surface-card card-lift glass-sheen relative flex flex-col overflow-hidden p-4">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-fuchsia-500/15 via-electric/15 to-ocean/10" />
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <div className="relative flex items-start gap-3">
                  <Link href={`/profile/${person.username}`}>
                    <Avatar src={person.avatarUrl} name={person.displayName} size="lg" neon />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${person.username}`} className="flex items-center gap-1 text-[14px] font-semibold text-ink hover:underline">
                      <span className="truncate">{person.displayName}</span>
                      {person.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-ocean" />}
                    </Link>
                    <p className="truncate text-[12px] text-ink-faint">@{person.username}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-muted">
                      {person.countryCode ? (
                        <>
                          <MapPin className="h-3 w-3" /> {flagEmoji(person.countryCode)} {countryName(person.countryCode)}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ink-faint">
                          <MapPin className="h-3 w-3" /> Country private
                        </span>
                      )}
                    </p>
                  </div>
                  <FollowButton username={person.username} isSelf={person.id === user.id} />
                </div>
                {person.bio && <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-5 text-ink-muted">{person.bio}</p>}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {person.interests.slice(0, 3).map((interest) => (
                    <Badge key={interest} variant="muted">
                      {interest}
                    </Badge>
                  ))}
                  {person.languages.slice(0, 2).map((code) => (
                    <Badge key={code} variant="ocean">
                      {(LANGUAGE_MAP as Map<string, { label: string }>).get(code)?.label ?? code.toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11.5px] text-ink-faint">
                  <span>{formatCount(person.followers)} followers</span>
                  <span>{formatCount(person.posts)} posts</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "posts" && (
        <PostList
          posts={posts.items}
          viewer={viewer}
          empty={<div className="surface-card"><EmptyState icon={<Compass className="h-6 w-6" />} title="No posts found" description="Try another search or hashtag." /></div>}
        />
      )}

      {tab === "communities" && (
        <div className="stagger-list grid gap-3 sm:grid-cols-2" data-reveal>
          {communities.length === 0 ? (
            <div className="surface-card sm:col-span-2">
              <EmptyState icon={<Users className="h-6 w-6" />} title="No communities found" description="Start one for your favorite corner of the world." />
            </div>
          ) : (
            communities.map((community) => (
              <Link key={community.id} href={`/communities/${community.slug}`} className="surface-card card-lift flex items-start gap-3 p-4">
                <span className="icon-tile h-11 w-11 rounded-xl">
                  <Users className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{community.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-5 text-ink-muted">{community.description}</span>
                  <span className="mt-1.5 block text-[11.5px] text-ink-faint">
                    {formatCount(community.memberCount)} members · {community.type.toLowerCase()}
                    {community.viewerRole ? " · joined" : ""}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "hashtags" && (
        <div className="surface-card divide-y divide-line">
          {hashtags.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-ink-faint">No hashtags yet.</p>
          ) : (
            hashtags.map((tag) => (
              <Link key={tag.tag} href={`/explore?tab=posts&hashtag=${encodeURIComponent(tag.tag)}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04]">
                <span className="icon-tile h-9 w-9 rounded-xl">
                  <Hash className="h-4 w-4" />
                </span>
                <span className="text-[13.5px] font-semibold text-ink">#{tag.tag}</span>
                <span className="ml-auto text-[11.5px] text-ink-faint">{formatCount(tag.count)} posts</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
