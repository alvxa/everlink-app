import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLiveRoom } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { LiveRoom } from "@/components/live/live-room";

type Params = { params: Promise<{ id: string }> };

function getIceServers(): RTCIceServer[] {
  const list = (value: string | undefined) =>
    (value ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
  const stun = list(process.env.STUN_URLS || "stun:stun.l.google.com:19302");
  const turn = list(process.env.TURN_URLS || process.env.TURN_URL);
  const servers: RTCIceServer[] = [];
  if (stun.length) servers.push({ urls: stun });
  if (turn.length) {
    servers.push({
      urls: turn,
      ...(process.env.TURN_USERNAME ? { username: process.env.TURN_USERNAME } : {}),
      ...(process.env.TURN_CREDENTIAL ? { credential: process.env.TURN_CREDENTIAL } : {}),
    });
  }
  return servers;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const room = await db.liveRoom.findUnique({ where: { id }, select: { title: true } });
  return { title: room?.title ?? "Live room" };
}

export const dynamic = "force-dynamic";

export default async function LiveRoomPage({ params }: Params) {
  const me = await getCurrentUser();
  if (!me) return null;
  const { id } = await params;
  const room = await getLiveRoom(id);
  if (!room) notFound();

  if (room.type === "PRIVATE" && room.host.id !== me.id) {
    const invite = await db.notification.findFirst({
      where: { userId: me.id, type: "LIVE_INVITE", entityType: "LIVE_ROOM", entityId: id },
      select: { id: true },
    });
    if (!invite) {
      return (
        <div className="px-4 pb-6 pt-5 sm:px-6">
          <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-ink">This room is invite only</h1>
            <p className="mt-2 max-w-sm text-[13.5px] leading-6 text-ink-muted">
              Ask the host for an invitation to join this private live room.
            </p>
            <Link href="/live" className="mt-5">
              <Button variant="secondary">Browse public rooms</Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  const viewer = {
    id: me.id,
    displayName: me.profile?.displayName || me.username,
    avatarUrl: me.profile?.avatarUrl ?? null,
  };

  return (
    <div className="px-4 pb-6 pt-5 sm:px-6">
      <LiveRoom room={room} viewer={viewer} iceServers={getIceServers()} />
    </div>
  );
}
