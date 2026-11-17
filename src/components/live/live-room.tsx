"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  MessageSquare,
  PhoneOff,
  Radio,
  Send,
  Shield,
  UserRound,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { InviteToLiveDialog } from "@/components/live/live-actions";
import { apiFetch, errorMessage } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import type { AuthorDTO } from "@/lib/types";

export type LiveParticipant = AuthorDTO & { role: string; muted: boolean; cameraOn: boolean };

export type LiveRoomView = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  topic: string | null;
  countryCode: string | null;
  startedAt: string;
  endedAt: string | null;
  host: AuthorDTO;
  community: { slug: string; name: string } | null;
  participants: LiveParticipant[];
};

type Peer = {
  socketId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  stream: MediaStream | null;
};

type ChatMessage = { userId: string; displayName: string; body: string; at: string };

export function LiveRoom({
  room,
  viewer,
  iceServers,
}: {
  room: LiveRoomView;
  viewer: { id: string; displayName: string; avatarUrl: string | null };
  iceServers: RTCIceServer[];
}) {
  const router = useRouter();
  const { socket } = useRealtime();
  const isHost = room.host.id === viewer.id;
  const [joined, setJoined] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [peers, setPeers] = React.useState<Record<string, Peer>>({});
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [chat, setChat] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [panel, setPanel] = React.useState<"chat" | "people">("chat");
  const [participants, setParticipants] = React.useState<LiveParticipant[]>(room.participants);
  const [ending, setEnding] = React.useState(false);

  const pcs = React.useRef(new Map<string, RTCPeerConnection>());
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const socketRef = React.useRef(socket);
  const micRef = React.useRef(true);
  const camRef = React.useRef(true);

  React.useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const removePeer = React.useCallback((socketId: string) => {
    const pc = pcs.current.get(socketId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      pcs.current.delete(socketId);
    }
    setPeers((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  React.useEffect(() => {
    const client = socket;
    if (!client) return;
    let cancelled = false;

    function addPeerMeta(payload: { socketId: string; userId: string; displayName?: string; username?: string; avatarUrl?: string | null }) {
      setPeers((prev) => ({
        ...prev,
        [payload.socketId]: prev[payload.socketId] ?? {
          socketId: payload.socketId,
          userId: payload.userId,
          displayName: payload.displayName || payload.username || "Guest",
          avatarUrl: payload.avatarUrl ?? null,
          stream: null,
        },
      }));
    }

    function ensurePc(socketId: string) {
      const existing = pcs.current.get(socketId);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers });
      const stream = localStreamRef.current;
      if (stream) for (const track of stream.getTracks()) pc.addTrack(track, stream);
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        client!.emit("webrtc:signal", {
          roomId: room.id,
          targetSocketId: socketId,
          data: { kind: "ice", candidate: event.candidate.toJSON() },
        });
      };
      pc.ontrack = (event) => {
        const inbound = event.streams[0] ?? null;
        setPeers((prev) => {
          const current = prev[socketId];
          if (!current) return prev;
          return { ...prev, [socketId]: { ...current, stream: inbound } };
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") removePeer(socketId);
      };
      pcs.current.set(socketId, pc);
      return pc;
    }

    async function offerTo(socketId: string) {
      try {
        const pc = ensurePc(socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        client!.emit("webrtc:signal", {
          roomId: room.id,
          targetSocketId: socketId,
          data: { kind: "offer", sdp: pc.localDescription },
        });
      } catch (error) {
        console.error("live offer failed", error);
      }
    }

    async function start() {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCamOn(false);
          camRef.current = false;
        } catch {
          setMediaError("Camera and microphone are unavailable. You can still listen and use chat.");
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      try {
        await apiFetch(`/api/v1/live/${room.id}/join`, { method: "POST" });
      } catch (error) {
        if (!cancelled) setJoinError(errorMessage(error));
        return;
      }
      if (cancelled) return;
      client!.emit("live:join", { roomId: room.id }, () => setJoined(true));
    }

    const onPeers = (payload: { peers?: { socketId: string; userId: string; username: string; displayName: string }[] }) => {
      for (const peer of payload.peers ?? []) {
        addPeerMeta({ ...peer, avatarUrl: null });
        void offerTo(peer.socketId);
      }
    };
    const onPeerJoined = (payload: { socketId: string; userId: string; username: string; displayName: string }) => {
      addPeerMeta({ ...payload, avatarUrl: null });
    };
    const onPeerLeft = (payload: { socketId: string }) => {
      if (payload?.socketId) removePeer(payload.socketId);
    };
    const onSignal = async (payload: {
      fromSocketId: string;
      fromUserId: string;
      fromDisplayName: string;
      data: { kind: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    }) => {
      try {
        const from = payload.fromSocketId;
        if (!from) return;
        addPeerMeta({ socketId: from, userId: payload.fromUserId, displayName: payload.fromDisplayName });
        const kind = payload.data?.kind;
        if (kind === "offer" && payload.data.sdp) {
          const pc = ensurePc(from);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          client!.emit("webrtc:signal", {
            roomId: room.id,
            targetSocketId: from,
            data: { kind: "answer", sdp: pc.localDescription },
          });
        } else if (kind === "answer" && payload.data.sdp) {
          const pc = pcs.current.get(from);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
        } else if (kind === "ice" && payload.data.candidate) {
          const pc = pcs.current.get(from);
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.data.candidate)).catch(() => {});
        }
      } catch (error) {
        console.error("live signal failed", error);
      }
    };
    const onChat = (payload: ChatMessage) => {
      if (!payload?.body) return;
      setChat((prev) => [...prev.slice(-199), payload]);
    };
    const onMediaState = (payload: { userId: string; muted: boolean; cameraOn: boolean }) => {
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === payload.userId
            ? { ...participant, muted: payload.muted, cameraOn: payload.cameraOn }
            : participant
        )
      );
    };

    client.on("live:peers", onPeers);
    client.on("live:peer-joined", onPeerJoined);
    client.on("live:peer-left", onPeerLeft);
    client.on("webrtc:signal", onSignal);
    client.on("live:chat", onChat);
    client.on("live:media-state", onMediaState);
    void start();

    return () => {
      cancelled = true;
      client.emit("live:leave", { roomId: room.id });
      void apiFetch(`/api/v1/live/${room.id}/join`, { method: "DELETE" }).catch(() => {});
      client.off("live:peers", onPeers);
      client.off("live:peer-joined", onPeerJoined);
      client.off("live:peer-left", onPeerLeft);
      client.off("webrtc:signal", onSignal);
      client.off("live:chat", onChat);
      client.off("live:media-state", onMediaState);
      for (const pc of pcs.current.values()) pc.close();
      pcs.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [socket, room.id, removePeer]);

  function toggleMic() {
    const next = !micRef.current;
    micRef.current = next;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => (track.enabled = next));
    socket?.emit("live:media-state", { roomId: room.id, muted: !next, cameraOn: camRef.current });
  }

  function toggleCam() {
    const next = !camRef.current;
    camRef.current = next;
    setCamOn(next);
    localStreamRef.current?.getVideoTracks().forEach((track) => (track.enabled = next));
    socket?.emit("live:media-state", { roomId: room.id, muted: !micRef.current, cameraOn: next });
  }

  function sendChat(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !socket) return;
    socket.emit("live:chat", { roomId: room.id, body });
    setDraft("");
  }

  async function endRoom() {
    if (!window.confirm("End this room for everyone?")) return;
    setEnding(true);
    try {
      await apiFetch(`/api/v1/live/${room.id}`, { method: "PATCH", json: { action: "end" } });
      router.push("/live");
      router.refresh();
    } catch (error) {
      toast({ title: "Could not end room", description: errorMessage(error), variant: "error" });
      setEnding(false);
    }
  }

  async function moderate(action: "mute" | "promote" | "remove", participant: LiveParticipant) {
    try {
      await apiFetch(`/api/v1/live/${room.id}`, {
        method: "PATCH",
        json:
          action === "mute"
            ? { action, userId: participant.id, muted: !participant.muted }
            : action === "promote"
              ? { action, userId: participant.id, role: participant.role === "SPEAKER" ? "AUDIENCE" : "SPEAKER" }
              : { action, userId: participant.id },
      });
      setParticipants((prev) =>
        prev
          .map((row) =>
            row.id === participant.id
              ? action === "mute"
                ? { ...row, muted: !participant.muted }
                : action === "promote"
                  ? { ...row, role: row.role === "SPEAKER" ? "AUDIENCE" : "SPEAKER" }
                  : row
              : row
          )
          .filter((row) => action !== "remove" || row.id !== participant.id)
      );
      toast({ title: "Participant updated", variant: "success" });
    } catch (error) {
      toast({ title: "Could not update participant", description: errorMessage(error), variant: "error" });
    }
  }

  if (room.status !== "LIVE") {
    return (
      <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3 text-ink-faint">
          <Radio className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">This room has ended</h1>
        <p className="mt-2 text-[13px] text-ink-muted">Thanks for stopping by. There may be another room live right now.</p>
        <Link href="/live" className="mt-5 text-[13px] font-semibold text-brand hover:underline">
          Browse live rooms
        </Link>
      </div>
    );
  }

  const peerList = Object.values(peers);
  const people = [...participants];
  for (const peer of peerList) {
    if (!people.some((person) => person.id === peer.userId)) {
      people.push({
        id: peer.userId,
        username: "",
        displayName: peer.displayName,
        avatarUrl: peer.avatarUrl,
        verified: false,
        countryCode: null,
        role: "AUDIENCE",
        muted: false,
        cameraOn: Boolean(peer.stream),
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="danger" className="gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
        </Badge>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold tracking-tight text-ink">{room.title}</h1>
          <p className="text-[12px] text-ink-faint">
            Hosted by {room.host.displayName} · started {timeAgo(room.startedAt)}
            {room.community && (
              <>
                {" · "}
                <Link href={`/communities/${room.community.slug}`} className="font-medium text-brand hover:underline">
                  {room.community.name}
                </Link>
              </>
            )}
          </p>
        </div>
        {room.type === "PRIVATE" && <Badge variant="outline">Invite only</Badge>}
        {isHost && <InviteToLiveDialog roomId={room.id} />}
        {isHost ? (
          <Button variant="destructive" size="sm" loading={ending} onClick={endRoom}>
            <PhoneOff className="h-4 w-4" /> End room
          </Button>
        ) : (
          <Link
            href="/live"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-red-500/10 px-3.5 text-[13px] font-semibold text-red-600 hover:bg-red-500/15 dark:text-red-400"
          >
            <PhoneOff className="h-4 w-4" /> Leave
          </Link>
        )}
      </div>

      {joinError && (
        <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-600 dark:text-red-400">{joinError}</p>
      )}
      {mediaError && (
        <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[13px] font-medium text-amber-600 dark:text-amber-400">{mediaError}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <VideoTile stream={localStream} name={viewer.displayName} avatarUrl={viewer.avatarUrl} muted mirrored isSelf />
            {peerList.map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={peer.stream}
                name={peer.displayName}
                avatarUrl={peer.avatarUrl}
                muted={people.find((person) => person.id === peer.userId)?.muted ?? false}
              />
            ))}
            {peerList.length === 0 && (
              <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2 p-4 text-center">
                <Users className="h-6 w-6 text-ink-faint" />
                <p className="mt-2 text-[12px] font-medium text-ink-muted">
                  {joined ? "Waiting for others to join..." : "Connecting..."}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-2.5">
            <Button variant={micOn ? "secondary" : "destructive"} size="icon" onClick={toggleMic} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>
              {micOn ? <Mic className="h-[18px] w-[18px]" /> : <MicOff className="h-[18px] w-[18px]" />}
            </Button>
            <Button variant={camOn ? "secondary" : "destructive"} size="icon" onClick={toggleCam} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>
              {camOn ? <Video className="h-[18px] w-[18px]" /> : <VideoOff className="h-[18px] w-[18px]" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPanel("chat")} aria-label="Open chat">
              <MessageSquare className="h-[18px] w-[18px]" />
            </Button>
            <span className="ml-1 inline-flex items-center gap-1.5 text-[11.5px] text-ink-faint">
              <Users className="h-3.5 w-3.5" /> {people.length}
            </span>
          </div>

          {room.description && <p className="surface-card p-4 text-[13px] leading-6 text-ink-muted">{room.description}</p>}
        </div>

        <div className="surface-card flex h-[420px] flex-col overflow-hidden lg:h-[520px]">
          <div className="flex border-b border-line">
            <button
              type="button"
              onClick={() => setPanel("chat")}
              className={cn(
                "flex-1 py-2.5 text-[12.5px] font-semibold transition",
                panel === "chat" ? "border-b-2 border-brand text-brand" : "text-ink-muted hover:text-ink"
              )}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setPanel("people")}
              className={cn(
                "flex-1 py-2.5 text-[12.5px] font-semibold transition",
                panel === "people" ? "border-b-2 border-brand text-brand" : "text-ink-muted hover:text-ink"
              )}
            >
              People ({people.length})
            </button>
          </div>

          {panel === "chat" ? (
            <>
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
                {chat.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-ink-faint">Say hello to break the ice.</p>
                ) : (
                  chat.map((message, index) => (
                    <div key={`${message.at}-${index}`} className="text-[12.5px] leading-5">
                      <span className={cn("font-semibold", message.userId === viewer.id ? "text-brand" : "text-ink")}>
                        {message.userId === viewer.id ? "You" : message.displayName}
                      </span>
                      <span className="ml-1.5 text-ink-muted">{message.body}</span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendChat} className="flex items-center gap-2 border-t border-line p-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={500}
                  placeholder="Message the room"
                  className="h-9 flex-1 rounded-xl bg-surface-2 px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint"
                />
                <Button type="submit" size="icon-sm" aria-label="Send message" disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <ul className="flex-1 space-y-1 overflow-y-auto p-2">
              {people.map((person) => (
                <li key={person.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                  <Avatar src={person.avatarUrl} name={person.displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ink">
                      {person.displayName}
                      {person.id === room.host.id && <Badge variant="mint" className="ml-1.5">Host</Badge>}
                      {person.role === "SPEAKER" && person.id !== room.host.id && (
                        <Badge variant="outline" className="ml-1.5">Speaker</Badge>
                      )}
                    </p>
                    <p className="text-[10.5px] text-ink-faint">
                      {person.muted ? "Muted" : "Mic on"} · {person.cameraOn ? "Camera on" : "Camera off"}
                    </p>
                  </div>
                  {isHost && person.id !== viewer.id && (
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Toggle mute for ${person.displayName}`}
                        onClick={() => moderate("mute", person)}
                      >
                        {person.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Change role for ${person.displayName}`}
                        onClick={() => moderate("promote", person)}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoTile({
  stream,
  name,
  avatarUrl,
  muted,
  mirrored,
  isSelf,
}: {
  stream: MediaStream | null;
  name: string;
  avatarUrl: string | null;
  muted?: boolean;
  mirrored?: boolean;
  isSelf?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const hasVideo = Boolean(stream && stream.getVideoTracks().length > 0);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-midnight">
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn("h-full w-full object-cover", !hasVideo && "hidden", mirrored && "-scale-x-100")}
        />
      )}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-2">
          <span className={cn("flex h-14 w-14 items-center justify-center rounded-full", !avatarUrl && "bg-brand-soft text-brand")}>
            {avatarUrl ? <Avatar src={avatarUrl} name={name} size="xl" /> : <UserRound className="h-7 w-7" />}
          </span>
          <p className="text-[12px] font-medium text-ink-muted">{name}</p>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-lg bg-black/55 px-2 py-0.5 text-[10.5px] font-semibold text-white">
        {isSelf ? "You" : name}
      </span>
    </div>
  );
}
