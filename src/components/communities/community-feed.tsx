"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MessagesSquare } from "lucide-react";
import { PostCard, type FeedViewer } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { EmptyState } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";
import type { FeedPostDTO } from "@/lib/types";

export function CommunityFeed({
  viewer,
  communitySlug,
  communityId,
  initialItems,
  initialCursor,
  canPost,
  canSee,
}: {
  viewer: FeedViewer;
  communitySlug: string;
  communityId: string;
  initialItems: FeedPostDTO[];
  initialCursor: string | null;
  canPost: boolean;
  canSee: boolean;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
  }, [initialItems, initialCursor]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: FeedPostDTO[]; nextCursor: string | null }>(
        `/api/v1/posts?community=${encodeURIComponent(communitySlug)}&limit=10&cursor=${encodeURIComponent(cursor)}`
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
  }

  return (
    <div className="space-y-4">
      {canPost && (
        <PostComposer
          viewer={viewer}
          defaultCommunityId={communityId}
          onCreated={(post) => setItems((prev) => [post, ...prev])}
          compact
        />
      )}

      {items.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<MessagesSquare className="h-6 w-6" />}
            title={canSee ? "No posts here yet" : "Join to see the conversation"}
            description={
              canSee
                ? canPost
                  ? "Start the conversation with the first post."
                  : "Members will post updates and ideas here soon."
                : "Members of this community can read and post updates here."
            }
            action={
              !canSee ? (
                <Link href={`/communities/${communitySlug}`} className="text-[13px] font-semibold text-brand hover:underline">
                  Back to community
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        items.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewer={viewer}
            onUpdated={(next) => setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)))}
            onDeleted={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
          />
        ))
      )}

      {cursor && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more posts
          </button>
        </div>
      )}
    </div>
  );
}
