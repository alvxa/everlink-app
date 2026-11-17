"use client";

import * as React from "react";
import { PostCard, type FeedViewer } from "@/components/feed/post-card";
import type { FeedPostDTO } from "@/lib/types";

export function PostList({
  posts,
  viewer,
  empty,
}: {
  posts: FeedPostDTO[];
  viewer: FeedViewer;
  empty?: React.ReactNode;
}) {
  const [items, setItems] = React.useState(posts);
  React.useEffect(() => setItems(posts), [posts]);

  if (items.length === 0) {
    return <>{empty ?? <p className="surface-card p-6 text-center text-[13px] text-ink-faint">No posts yet.</p>}</>;
  }

  return (
    <div className="space-y-4">
      {items.map((post, index) => (
        <div key={post.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}>
          <PostCard
            post={post}
            viewer={viewer}
            onUpdated={(next) => setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)))}
            onDeleted={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
          />
        </div>
      ))}
    </div>
  );
}
