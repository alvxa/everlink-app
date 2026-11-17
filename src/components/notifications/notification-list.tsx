"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/types";

const TYPE_ICON: Record<string, string> = {
  FOLLOW: "👤",
  FRIEND_REQUEST: "🤝",
  FRIEND_ACCEPT: "🤝",
  POST_LIKE: "❤️",
  POST_COMMENT: "💬",
  COMMENT_REPLY: "💬",
  MENTION: "@",
  MESSAGE: "✉️",
  COMMUNITY_INVITE: "🏘️",
  LIVE_INVITE: "📡",
  SYSTEM: "✨",
};

export function NotificationList({
  initialItems,
  initialCursor,
  initialUnread,
}: {
  initialItems: NotificationDTO[];
  initialCursor: string | null;
  initialUnread: number;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [unread, setUnread] = React.useState(initialUnread);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ items: NotificationDTO[]; nextCursor: string | null; unreadCount: number }>(
        "/api/v1/notifications"
      );
      setItems(data.items);
      setCursor(data.nextCursor);
      setUnread(data.unreadCount);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("everlink:notification", handler);
    return () => window.removeEventListener("everlink:notification", handler);
  }, [refresh]);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("everlink:notifications-set", { detail: { count: unread } }));
  }, [unread]);

  async function markAll() {
    try {
      await apiFetch("/api/v1/notifications", { method: "PATCH", json: { all: true } });
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnread(0);
      router.refresh();
    } catch (error) {
      toast({ title: "Could not mark notifications", description: errorMessage(error), variant: "error" });
    }
  }

  async function openItem(item: NotificationDTO) {
    if (!item.readAt) {
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)));
      setUnread((count) => Math.max(0, count - 1));
      apiFetch(`/api/v1/notifications/${item.id}`, { method: "PATCH" }).catch(() => {});
      router.refresh();
    }
    if (item.link) router.push(item.link);
  }

  async function remove(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiFetch(`/api/v1/notifications/${id}`, { method: "DELETE" });
    } catch (error) {
      toast({ title: "Could not delete notification", description: errorMessage(error), variant: "error" });
      void refresh();
    }
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: NotificationDTO[]; nextCursor: string | null }>(
        `/api/v1/notifications?cursor=${encodeURIComponent(cursor)}`
      );
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-10 w-10 rounded-2xl">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-[22px] font-bold tracking-tight text-ink">Notifications</h1>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              {unread > 0 ? `${unread} unread` : "You are all caught up"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={markAll} disabled={unread === 0}>
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="No notifications yet"
            description="Follows, reactions, comments and invitations will appear here."
          />
        </div>
      ) : (
        <div className="surface-card stagger-list divide-y divide-line/70 overflow-hidden dark:divide-white/[0.06]">
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void openItem(item);
              }}
              className={cn(
                "group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-surface-2 dark:hover:bg-white/[0.04]",
                !item.readAt && "bg-gradient-to-r from-electric/15 to-transparent shadow-[inset_2px_0_0_rgba(167,139,250,.8)]"
              )}
            >
              {item.actor ? (
                <Avatar src={item.actor.avatarUrl} name={item.actor.displayName} size="sm" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-electric/20 to-ocean/10 text-[14px]">
                  {TYPE_ICON[item.type] ?? "✨"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-5 text-ink">{item.title}</p>
                {item.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-ink-muted">{item.body}</p>}
                <p className="mt-1 text-[11px] text-ink-faint">{timeAgo(item.createdAt)}</p>
              </div>
              {!item.readAt && <span className="unread-pulse mt-2 h-2 w-2 shrink-0 rounded-full bg-electric shadow-[0_0_10px_rgba(167,139,250,.9)]" aria-label="Unread" />}
              <button
                type="button"
                onClick={(event) => remove(event, item.id)}
                aria-label="Delete notification"
                className="rounded-lg p-1.5 text-ink-faint opacity-0 transition hover:bg-surface-3 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <button type="button" onClick={loadMore} className="text-[13px] font-semibold text-brand hover:underline">
            {loading ? "Loading..." : "Load older notifications"}
          </button>
        </div>
      )}

      <p className="text-center text-[11.5px] text-ink-faint">
        Manage what you receive in <Link href="/settings?section=notifications" className="font-semibold text-brand hover:underline">notification settings</Link>.
      </p>
    </div>
  );
}
