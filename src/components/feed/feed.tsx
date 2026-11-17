"use client";

import * as React from "react";
import Link from "next/link";
import { Compass, Loader2, Sparkles } from "lucide-react";
import { PostCard, type FeedViewer } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { EmptyState } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { FeedPostDTO } from "@/lib/types";

type Mode = "for-you" | "following" | "latest" | "bookmarks";

const TABS: { key: Mode; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "following", label: "Following" },
  { key: "latest", label: "Latest" },
  { key: "bookmarks", label: "Bookmarks" },
];

export function Feed({
  viewer,
  mode,
  initialItems,
  initialCursor,
  basePath = "/home",
  emptyTitle = "Your feed is quiet",
  emptyDescription = "Follow people and join communities to fill this space with new perspectives.",
  showComposer = true,
  defaultCountryCode,
}: {
  viewer: FeedViewer;
  mode: Mode;
  initialItems: FeedPostDTO[];
  initialCursor: string | null;
  basePath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showComposer?: boolean;
  defaultCountryCode?: string | null;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);
  const sentinel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
  }, [initialItems, initialCursor]);

  const loadMore = React.useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: FeedPostDTO[]; nextCursor: string | null }>(
        `/api/v1/posts?mode=${mode}&limit=10&cursor=${encodeURIComponent(cursor)}`
      );
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...data.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(data.nextCursor);
    } catch (error) {
      toast({ title: "Could not load more posts", description: errorMessage(error), variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, mode]);

  React.useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  function updatePost(next: FeedPostDTO) {
    setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }

  function removePost(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-4">
      {showComposer && (
        <PostComposer viewer={viewer} defaultCountryCode={defaultCountryCode} onCreated={(post) => setItems((prev) => [post, ...prev])} />
      )}

      <div className="surface-card flex items-center gap-1 overflow-x-auto p-1.5">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "for-you" ? basePath : `${basePath}?tab=${tab.key}`}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all",
              mode === tab.key
                ? "bg-gradient-to-r from-fuchsia-500 via-electric to-ocean text-white shadow-[0_10px_30px_-14px_rgba(139,92,246,1)] ring-1 ring-inset ring-white/20"
                : "text-ink-muted hover:bg-surface-3 hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Link href="/explore" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
                <Compass className="h-4 w-4" /> Discover people
              </Link>
            }
          />
        </div>
      ) : (
        items.map((post, index) => (
          <div key={post.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}>
            <PostCard post={post} viewer={viewer} onUpdated={updatePost} onDeleted={removePost} />
          </div>
        ))
      )}

      <div ref={sentinel} className="flex justify-center py-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
        ) : cursor ? (
          <button type="button" onClick={loadMore} className="text-[13px] font-semibold text-brand hover:underline">
            Load more posts
          </button>
        ) : items.length > 0 ? (
          <p className="text-[12px] text-ink-faint">You are all caught up.</p>
        ) : null}
      </div>
    </div>
  );
}
