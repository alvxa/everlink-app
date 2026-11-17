import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe2, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts, getStoryFeed, getSuggestedPeople, getTrendingHashtags } from "@/lib/queries";
import { Feed } from "@/components/feed/feed";
import { StoryStrip } from "@/components/stories/story-strip";
import { GlobeVisual } from "@/components/app/globe-visual";
import { Avatar } from "@/components/ui/avatar";
import { countryName } from "@/lib/countries";
import { flagEmoji } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

type Search = { tab?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { tab } = await searchParams;
  const mode = tab === "following" || tab === "latest" || tab === "bookmarks" ? tab : "for-you";

  const [feed, stories, trending, people] = await Promise.all([
    getFeedPosts({ viewerId: user.id, mode, limit: 10 }),
    getStoryFeed(user.id),
    getTrendingHashtags(6),
    getSuggestedPeople({ viewerId: user.id, sort: "popular", limit: 6 }),
  ]);

  const viewer = {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName || user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
  const firstName = viewer.displayName.split(" ")[0];

  return (
    <div className="space-y-5 px-4 pb-6 pt-4 sm:px-6 sm:pt-5">
      <section className="hero-shell conic-border animate-fade-in">
        <div className="hero-grid" />
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <span className="absolute -left-16 top-4 h-44 w-44 rounded-full bg-fuchsia-400/15 blur-3xl motion-safe:animate-glow-pulse dark:bg-fuchsia-500/25" />
          <span
            className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-electric/15 blur-3xl motion-safe:animate-glow-pulse dark:bg-electric/25"
            style={{ animationDelay: "1.6s" }}
          />
          <span className="scan-line" />
          <span className="twinkle left-[58%] top-[16%] h-1 w-1" style={{ animationDelay: "0.2s" }} />
          <span className="twinkle left-[76%] top-[38%] h-1.5 w-1.5" style={{ animationDelay: "1.1s" }} />
          <span className="twinkle left-[46%] top-[70%] h-1 w-1" style={{ animationDelay: "2s" }} />
          <span className="twinkle left-[88%] top-[62%] h-1 w-1" style={{ animationDelay: "0.7s" }} />
        </div>
        <div className="relative z-10 flex flex-col gap-7 px-5 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:gap-4">
          <div className="max-w-[450px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-700 dark:text-fuchsia-100 dark:shadow-[0_0_26px_-12px_rgba(236,72,153,.8)]">
              <Sparkles className="h-3 w-3 text-ocean dark:text-cyan-300" /> Connect beyond boundaries
            </span>
            <h1 className="mt-4 animate-rise-in font-display text-[31px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[38px] dark:text-white" style={{ animationDelay: "80ms" }}>
              Your world.
              <br />
              <span className="gradient-text">Your people.</span>
              <br />
              <span className="word-shine">Your connections.</span>
            </h1>
            <p className="mt-3 max-w-[390px] animate-rise-in text-[13px] leading-6 text-ink-muted dark:text-white/75" style={{ animationDelay: "160ms" }}>
              Welcome back, {firstName}. Discover cultures, build communities and talk with people across the globe.
            </p>
            <div className="mt-5 flex animate-rise-in flex-wrap items-center gap-2.5" style={{ animationDelay: "220ms" }}>
              <Link
                href="/world"
                className="group inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-electric via-ocean to-mint px-4 text-[13px] font-semibold text-white shadow-[0_10px_26px_-16px_rgba(39,153,232,.9)] ring-1 ring-inset ring-white/25 transition hover:brightness-105 active:scale-[0.98] dark:from-fuchsia-500 dark:via-electric dark:to-ocean dark:shadow-[0_12px_34px_-14px_rgba(139,92,246,1)] dark:hover:brightness-110"
              >
                <Globe2 className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" /> Explore the world
              </Link>
              <Link
                href="/explore?tab=people"
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface/80 px-4 text-[13px] font-semibold text-ink backdrop-blur transition hover:bg-surface active:scale-[0.98] dark:border-white/15 dark:bg-white/[0.06] dark:text-white/85 dark:hover:bg-white/[0.12]"
              >
                Find your people <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-[170px] shrink-0 motion-safe:animate-float sm:w-[230px] lg:ml-auto lg:mr-2 lg:w-[250px]">
            <GlobeVisual />
          </div>
        </div>
      </section>

      {people.length > 0 && (
        <section className="animate-rise-in" style={{ animationDelay: "120ms" }}>
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">Discover</p>
              <h2 className="mt-0.5 font-display text-[17px] font-semibold tracking-tight text-ink">People to follow</h2>
            </div>
            <Link
              href="/explore?tab=people"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="hide-scrollbar stagger-list flex gap-3 overflow-x-auto pb-1">
            {people.map((person) => (
              <Link
                key={person.id}
                href={`/profile/${person.username}`}
                className="surface-card card-lift group relative block w-[168px] shrink-0 overflow-hidden p-3.5"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-fuchsia-500/25 via-electric/25 to-ocean/15" />
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="relative">
                  <Avatar src={person.avatarUrl} name={person.displayName} size="lg" neon />
                  <ArrowRight className="absolute right-0 top-2 h-3.5 w-3.5 text-ink opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-white/80" />
                  <p className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-ink">
                    <span className="truncate">{person.displayName}</span>
                    {person.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-ocean-soft" />}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">@{person.username}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-muted">
                    {person.countryCode ? (
                      <>
                        <span>{flagEmoji(person.countryCode)}</span>
                        <span className="truncate">{countryName(person.countryCode)}</span>
                      </>
                    ) : (
                      <span className="text-ink-faint">Worldwide</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <StoryStrip stories={stories} viewer={viewer} />

      <Feed
        viewer={viewer}
        mode={mode}
        initialItems={feed.items}
        initialCursor={feed.nextCursor}
        basePath="/home"
        defaultCountryCode={user.profile?.countryCode ?? null}
      />

      {trending.length > 0 && (
        <section className="surface-card p-4 xl:hidden">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h2 className="text-[14px] font-semibold text-ink">Trending hashtags</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trending.map((tag) => (
              <Link
                key={tag.tag}
                href={`/explore?hashtag=${encodeURIComponent(tag.tag)}`}
                className="rounded-full border border-line bg-surface-3/60 px-3 py-1.5 text-[12.5px] font-medium text-ink-muted transition hover:border-brand/40 hover:text-brand"
              >
                #{tag.tag}
                <span className="ml-1.5 text-[11px] text-ink-faint">{tag.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
