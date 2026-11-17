"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StoryViewer } from "@/components/stories/story-strip";
import { cn, timeAgo } from "@/lib/utils";
import type { AuthorDTO, StoryDTO } from "@/lib/types";

type StoryGroup = { author: AuthorDTO; stories: StoryDTO[] };

export function MomentsGallery({
  groups,
  viewer,
}: {
  groups: StoryGroup[];
  viewer: { id: string; username: string; displayName: string; avatarUrl: string | null };
}) {
  const [openGroup, setOpenGroup] = React.useState<number | null>(null);

  if (!groups.length) return null;

  return (
    <>
      <div className="stagger-list space-y-3" data-reveal>
        {groups.map((group, groupIndex) => (
          <section key={group.author.id} className="surface-card p-3.5">
            <div className="mb-2.5 flex items-center gap-2.5">
              <Avatar src={group.author.avatarUrl} name={group.author.displayName} size="sm" neon />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{group.author.displayName}</p>
                <p className="text-[10.5px] text-ink-faint">
                  {group.stories.length} {group.stories.length === 1 ? "moment" : "moments"} · {timeAgo(group.stories[0]?.createdAt ?? "")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenGroup(groupIndex)}
                className="text-[12px] font-semibold text-brand hover:underline"
              >
                Watch all
              </button>
            </div>
            <div className="hide-scrollbar flex gap-2 overflow-x-auto">
              {group.stories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => setOpenGroup(groupIndex)}
                  className={cn(
                    "relative h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-400/50 hover:shadow-[0_0_28px_-14px_rgba(192,38,211,.95)]",
                    story.viewed && "opacity-70"
                  )}
                  style={story.type === "TEXT" ? { backgroundColor: story.background } : undefined}
                >
                  {story.type === "IMAGE" && story.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" />
                  ) : story.type === "VIDEO" && story.mediaUrl ? (
                    <video src={story.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full p-2 text-[11px] font-semibold leading-4 text-white">
                      {story.body.slice(0, 70)}
                    </span>
                  )}
                  {story.type === "VIDEO" && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white">
                      <Play className="h-3 w-3" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-medium text-white">
                    {timeAgo(story.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {openGroup !== null && (
        <StoryViewer groups={groups} startGroup={openGroup} viewer={viewer} onClose={() => setOpenGroup(null)} />
      )}
    </>
  );
}
