"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { timeAgo } from "@/lib/utils";

export type RailPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  countryCode: string | null;
  lastActiveAt: string | null;
};

export function PeopleNow({ people }: { people: RailPerson[] }) {
  const { online, connected } = useRealtime();
  const activeCount = people.filter((person) => online.has(person.id)).length;

  return (
    <section className="surface-card glass-sheen overflow-hidden">
      <div className="panel-header">
        <span className="icon-tile h-7 w-7 rounded-[0.6rem]">
          <span className="relative flex h-2 w-2">
            {activeCount > 0 && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${activeCount > 0 ? "bg-mint" : "bg-ink-faint/50"}`} />
          </span>
        </span>
        <h2 className="panel-title">{activeCount > 0 ? "Active now" : "People to follow"}</h2>
        <Link href="/explore?tab=people" className="ml-auto inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-brand hover:underline">
          See all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {people.length === 0 ? (
        <p className="px-4 py-3 text-[12.5px] leading-5 text-ink-muted">
          No suggestions yet. Explore the world map to find people near you.
        </p>
      ) : (
        <ul className="stagger-list space-y-0.5 p-2">
          {people.map((person) => {
            const isOnline = online.has(person.id);
            return (
              <li key={person.id}>
                <Link
                  href={`/profile/${person.username}`}
                  className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-surface-3/70 dark:hover:bg-white/[0.05]"
                >
                  <Avatar src={person.avatarUrl} name={person.displayName} size="sm" online={isOnline || undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-[13px] font-semibold text-ink">{person.displayName}</span>
                      {person.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-ocean-soft" />}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {isOnline
                        ? "Online"
                        : person.lastActiveAt
                          ? `Active ${timeAgo(person.lastActiveAt)}`
                          : `@${person.username}`}
                    </span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2 px-1.5 text-[10.5px] text-ink-faint">
        {connected ? "Presence updates in real time" : "Reconnecting to live presence..."}
      </p>
    </section>
  );
}
