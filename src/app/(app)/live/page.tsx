import type { Metadata } from "next";
import Link from "next/link";
import { Radio, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLiveRooms } from "@/lib/queries";
import { countryName } from "@/lib/countries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CreateLiveRoomDialog } from "@/components/live/live-actions";
import { flagEmoji, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Live" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const me = await getCurrentUser();
  if (!me) return null;

  const [rooms, memberships] = await Promise.all([
    getLiveRooms(30),
    db.communityMember.findMany({
      where: { userId: me.id },
      orderBy: { joinedAt: "desc" },
      take: 50,
      select: { community: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-4 px-4 pb-6 pt-5 sm:px-6">
      <PageHeader
        title="Live rooms"
        description="Drop in for a voice or video conversation. Rooms are peer-to-peer and stay in your browser."
        action={<CreateLiveRoomDialog communities={memberships.map((row) => row.community)} defaultCountryCode={me.profile?.countryCode ?? null} />}
      />

      {rooms.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<Radio className="h-6 w-6" />}
            title="No rooms are live right now"
            description="Start a room for a language exchange, a study session or a casual hangout."
            action={<CreateLiveRoomDialog communities={memberships.map((row) => row.community)} defaultCountryCode={me.profile?.countryCode ?? null} />}
          />
        </div>
      ) : (
        <ul className="stagger-list grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-reveal>
          {rooms.map((room) => (
            <li key={room.id}>
              <Link href={`/live/${room.id}`} className="surface-card card-lift glass-sheen group block overflow-hidden">
                <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-[#171233] via-[#100c26] to-fuchsia-600/30">
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(56,189,248,.18),transparent_55%),radial-gradient(circle_at_25%_85%,rgba(217,70,239,.22),transparent_55%)]" />
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent" />
                  <Radio className="relative h-8 w-8 text-[#e9d5ff] drop-shadow-[0_0_16px_rgba(192,38,211,.9)]" />
                  <span className="live-glow absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-red-300/40 bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                  </span>
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">
                    <Users className="h-3 w-3" /> {room.participants}
                  </span>
                  <span className="equalizer absolute bottom-2.5 left-3 text-[#e9d5ff]" aria-hidden>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="truncate text-[14px] font-semibold text-ink transition group-hover:text-brand dark:group-hover:text-[#e9d5ff]">{room.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar src={room.host.avatarUrl} name={room.host.displayName} size="xs" />
                    <span className="truncate text-[11.5px] text-ink-faint">{room.host.displayName}</span>
                    <span className="text-[11px] text-ink-faint">· {timeAgo(room.startedAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {room.topic && <Badge variant="outline">{room.topic}</Badge>}
                    {room.countryCode && (
                      <Badge variant="muted">
                        {flagEmoji(room.countryCode)} {countryName(room.countryCode)}
                      </Badge>
                    )}
                    {room.type === "PRIVATE" && <Badge variant="danger">Invite only</Badge>}
                  </div>
                  {room.community && (
                    <p className="mt-2 truncate text-[11px] text-ink-faint">in {room.community.name}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
