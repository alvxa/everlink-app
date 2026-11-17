import Link from "next/link";
import { ArrowUpRight, Globe2, Radio, Sparkles, TrendingUp, Users } from "lucide-react";
import { getLiveRooms, getSuggestedPeople, getTrendingHashtags } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { PeopleNow } from "@/components/app/people-now";

export async function RightRail({ viewerId }: { viewerId: string }) {
  const [people, trending, rooms] = await Promise.all([
    getSuggestedPeople({ viewerId, sort: "recent", limit: 6 }),
    getTrendingHashtags(5),
    getLiveRooms(3),
  ]);

  return (
    <div className="space-y-3.5">
      <div className="animate-rise-in" style={{ animationDelay: "40ms" }}>
        <PeopleNow
          people={people.map((person) => ({
            id: person.id,
            username: person.username,
            displayName: person.displayName,
            avatarUrl: person.avatarUrl,
            verified: person.verified,
            countryCode: person.countryCode,
            lastActiveAt: person.lastActiveAt,
          }))}
        />
      </div>

      {trending.length > 0 && (
        <section className="surface-card glass-sheen animate-rise-in overflow-hidden" style={{ animationDelay: "120ms" }}>
          <div className="panel-header">
            <span className="icon-tile">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="panel-title">Trending</h2>
            <Link href="/explore?tab=hashtags" className="ml-auto text-[11.5px] font-semibold text-brand hover:underline">
              See all
            </Link>
          </div>
          <ol className="space-y-0.5 p-2">
            {trending.map((tag, index) => (
              <li key={tag.tag}>
                <Link
                  href={`/explore?hashtag=${encodeURIComponent(tag.tag)}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-3/70 dark:hover:bg-white/[0.05]"
                >
                  <span className="w-4 text-[10.5px] font-bold tabular-nums text-ink-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">#{tag.tag}</span>
                    <span className="text-[10.5px] text-ink-faint">{tag.count} posts</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="surface-card glass-sheen animate-rise-in overflow-hidden" style={{ animationDelay: "200ms" }}>
        <div className="panel-header">
          <span className="icon-tile">
            <Radio className="h-4 w-4" />
          </span>
          <h2 className="panel-title">Live rooms</h2>
          <Link href="/live" className="ml-auto text-[11.5px] font-semibold text-brand hover:underline">
            Browse
          </Link>
        </div>
        {rooms.length === 0 ? (
          <div className="m-3 rounded-xl border border-dashed border-line px-3 py-4 text-center">
            <p className="text-[12px] text-ink-muted">No rooms are live right now.</p>
            <Link href="/live" className="mt-1 inline-block text-[12px] font-semibold text-brand hover:underline">
              Start a room
            </Link>
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/live/${room.id}`}
                  className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-surface-3/70 dark:hover:bg-white/[0.05]"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/30 via-fuchsia-500/20 to-violet-600/30 ring-1 ring-white/10">
                    <Radio className="h-4 w-4 text-white" />
                    <span className="absolute left-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">{room.title}</span>
                    <span className="flex items-center gap-1 text-[10.5px] text-ink-faint">
                      <Avatar src={room.host.avatarUrl} name={room.host.displayName} size="xs" className="h-4 w-4" />
                      <span className="truncate">{room.host.displayName}</span>
                      <span aria-hidden>·</span>
                      <Users className="h-3 w-3" /> {room.participants}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="relative animate-rise-in overflow-hidden rounded-[1.35rem] border border-electric/30 bg-gradient-to-br from-[#2a1a5e] via-[#141634] to-[#08111f] p-4 shadow-[0_24px_60px_-38px_rgba(139,92,246,.9)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-fuchsia-500/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-ocean/30 blur-2xl" />
        <div className="relative flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/75">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> The world map
        </div>
        <p className="relative mt-2 font-display text-[16px] font-semibold leading-6 text-white">
          One feed, every culture.
        </p>
        <p className="relative mt-1 text-[11.5px] leading-5 text-white/75">
          Browse country hubs, local communities and people from across the globe.
        </p>
        <Link
          href="/world"
          className="relative mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
        >
          <Globe2 className="h-3.5 w-3.5" /> Explore the map
        </Link>
      </section>
    </div>
  );
}
