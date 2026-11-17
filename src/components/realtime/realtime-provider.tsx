"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "@/components/ui/toast";

type RealtimeState = {
  socket: Socket | null;
  connected: boolean;
  online: Set<string>;
};

const RealtimeContext = React.createContext<RealtimeState>({ socket: null, connected: false, online: new Set() });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [online, setOnline] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const client = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    setSocket(client);

    client.on("connect", () => setConnected(true));
    client.on("disconnect", () => setConnected(false));
    client.on("connect_error", () => setConnected(false));

    client.on("presence:init", (payload: { online?: string[] }) => {
      setOnline(new Set(payload?.online ?? []));
    });
    client.on("presence:update", (payload: { userId?: string; online?: boolean }) => {
      if (!payload?.userId) return;
      setOnline((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId!);
        else next.delete(payload.userId!);
        return next;
      });
    });
    client.on("notification:new", (payload: { title?: string; body?: string; type?: string; link?: string }) => {
      window.dispatchEvent(new CustomEvent("everlink:notification", { detail: payload }));
      if (payload?.type !== "MESSAGE") {
        toast({
          title: payload?.title || "New notification",
          description: payload?.body,
          variant: "info",
        });
      }
    });
    client.on("message:new", (payload: { conversationId?: string; body?: string; sender?: { displayName?: string } }) => {
      window.dispatchEvent(new CustomEvent("everlink:message", { detail: payload }));
    });

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, []);

  const value = React.useMemo(() => ({ socket, connected, online }), [socket, connected, online]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return React.useContext(RealtimeContext);
}
