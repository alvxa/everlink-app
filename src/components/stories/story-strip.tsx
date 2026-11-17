"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock3, Heart, Plus, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import type { AuthorDTO, StoryDTO } from "@/lib/types";

type StoryGroup = { author: AuthorDTO; stories: StoryDTO[] };

export function StoryStrip({ stories, viewer }: { stories: StoryGroup[]; viewer: { id: string; username: string; displayName: string; avatarUrl: string | null } }) {
  const [openAt, setOpenAt] = React.useState<number | null>(null);
  return (
    <>
      <section aria-label="Moments" className="surface-card overflow-hidden">
        <div className="panel-header">
          <span className="icon-tile">
            <Clock3 className="h-4 w-4" />
          </span>
          <h2 className="panel-title">Moments</h2>
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            24h
          </span>
        </div>
        <div className="hide-scrollbar stagger-list flex gap-3 overflow-x-auto p-3">
          <Link href="/moments?compose=1" className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-line bg-surface-2 text-ink-faint">
              <Avatar src={viewer.avatarUrl} name={viewer.displayName} size="lg" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-electric text-white ring-2 ring-surface">
                <Plus className="h-3 w-3" />
              </span>
            </span>
            <span className="w-full truncate text-center text-[10.5px] font-medium text-ink-muted">Your moment</span>
          </Link>
          {stories.map((group, index) => {
            const allViewed = group.stories.every((story) => story.viewed);
            return (
              <button
                key={group.author.id}
                type="button"
                onClick={() => setOpenAt(index)}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full p-[2.5px]",
                    allViewed ? "bg-line" : "animate-gradient-flow bg-gradient-to-tr from-fuchsia-500 via-electric to-cyan-400 bg-[length:220%_220%] shadow-[0_0_18px_-6px_rgba(192,38,211,.7)]"
                  )}
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-surface p-[2px]">
                    <Avatar src={group.author.avatarUrl} name={group.author.displayName} size="lg" />
                  </span>
                </span>
                <span className={cn("w-full truncate text-center text-[10.5px] font-medium", allViewed ? "text-ink-faint" : "text-ink")}>
                  {group.author.displayName.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      {openAt !== null && (
        <StoryViewer
          groups={stories}
          startGroup={openAt}
          viewer={viewer}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

export function StoryViewer({
  groups,
  startGroup,
  viewer,
  onClose,
}: {
  groups: StoryGroup[];
  startGroup: number;
  viewer: { id: string; username: string; displayName: string; avatarUrl: string | null };
  onClose: () => void;
}) {
  const [groupIndex, setGroupIndex] = React.useState(startGroup);
  const [storyIndex, setStoryIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [reply, setReply] = React.useState("");
  const [reacted, setReacted] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const next = React.useCallback(() => {
    if (!group) return;
    if (storyIndex + 1 < group.stories.length) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const prev = React.useCallback(() => {
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else if (groupIndex > 0) {
      const previous = groups[groupIndex - 1]!;
      setGroupIndex(groupIndex - 1);
      setStoryIndex(previous.stories.length - 1);
    }
  }, [storyIndex, groupIndex, groups]);

  React.useEffect(() => {
    setProgress(0);
    setReacted(false);
    if (!story) return;
    apiFetch(`/api/v1/stories/${story.id}/view`, { method: "POST" }).catch(() => {});
    const started = Date.now();
    const duration = 6000;
    const interval = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(interval);
        next();
      }
    }, 60);
    return () => window.clearInterval(interval);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [next, prev, onClose]);

  if (!group || !story) return null;

  async function react() {
    if (!story || reacted) return;
    setReacted(true);
    try {
      await apiFetch(`/api/v1/stories/${story.id}/react`, { method: "POST", json: { type: "LOVE" } });
    } catch {
      setReacted(false);
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!story || !reply.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch(`/api/v1/stories/${story.id}/reply`, { method: "POST", json: { body: reply.trim() } });
      setReply("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-midnight/95">
      <div className="relative flex h-dvh w-full max-w-[440px] flex-col bg-midnight sm:h-[92dvh] sm:rounded-3xl sm:border sm:border-white/10">
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">
          {group.stories.map((item, index) => (
            <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className="block h-full bg-white transition-[width] duration-100"
                style={{ width: index < storyIndex ? "100%" : index === storyIndex ? `${progress}%` : "0%" }}
              />
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 top-5 z-10 flex items-center gap-2.5 px-3 pt-2">
          <Avatar src={group.author.avatarUrl} name={group.author.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${group.author.username}`} className="block truncate text-[13px] font-semibold text-white">
              {group.author.displayName}
            </Link>
            <p className="text-[10.5px] text-white/60">{timeAgo(story.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close moments" className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {story.type === "TEXT" ? (
            <div className="flex h-full w-full items-center justify-center px-8 text-center" style={{ backgroundColor: story.background }}>
              <p className="whitespace-pre-wrap text-[22px] font-semibold leading-8 text-white">{story.body}</p>
            </div>
          ) : story.type === "VIDEO" ? (
            <video src={story.mediaUrl ?? undefined} autoPlay playsInline className="h-full w-full object-contain" />
          ) : story.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.mediaUrl} alt={story.body || "Moment"} className="h-full w-full object-contain" />
          ) : null}

          <button type="button" onClick={prev} aria-label="Previous moment" className="absolute left-0 top-0 h-full w-1/3 cursor-w-resize" />
          <button type="button" onClick={next} aria-label="Next moment" className="absolute right-0 top-0 h-full w-1/3 cursor-e-resize" />
        </div>

        {story.type !== "TEXT" && story.body && (
          <p className="px-5 pb-2 text-center text-[13px] leading-5 text-white/90">{story.body}</p>
        )}

        <div className="flex items-center gap-2 border-t border-white/10 p-3">
          <form onSubmit={sendReply} className="flex flex-1 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={`Reply to ${group.author.displayName.split(" ")[0]}...`}
              maxLength={500}
              className="h-10 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/60"
            />
            <button type="submit" disabled={!reply.trim() || sending} aria-label="Send reply" className="p-1 text-white/70 hover:text-white disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <button
            type="button"
            onClick={react}
            aria-label="React with love"
            className={cn("rounded-full p-2.5 transition", reacted ? "text-rose-400" : "text-white/70 hover:text-white")}
          >
            <Heart className={cn("h-5 w-5", reacted && "fill-current")} />
          </button>
          <button type="button" onClick={next} aria-label="Next" className="rounded-full p-2.5 text-white/70 hover:text-white">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={prev} aria-label="Previous" className="hidden rounded-full p-2.5 text-white/70 hover:text-white sm:block">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <p className="sr-only">{viewer.username}</p>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}
