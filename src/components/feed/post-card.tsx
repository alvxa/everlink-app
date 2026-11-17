"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  Flag,
  Globe2,
  Languages,
  Link2,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share2,
  Smile,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown, MenuDivider, MenuItem } from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/report-dialog";
import { RichText } from "@/components/feed/rich-text";
import { apiFetch, errorMessage } from "@/lib/client";
import { REACTIONS, REACTION_EMOJI } from "@/lib/constants";
import { cn, flagEmoji, formatCount, timeAgo } from "@/lib/utils";
import type { FeedPostDTO } from "@/lib/types";

export type FeedViewer = { id: string; username: string; displayName: string; avatarUrl: string | null };

const VISIBILITY_ICON: Record<string, React.ReactNode> = {
  PUBLIC: <Globe2 className="h-3 w-3" />,
  FOLLOWERS: <Users className="h-3 w-3" />,
  COMMUNITY: <Lock className="h-3 w-3" />,
};

function MediaGrid({ media }: { media: FeedPostDTO["media"] }) {
  if (!media.length) return null;
  const count = media.length;
  return (
    <div
      className={cn(
        "mt-3 grid gap-1 overflow-hidden rounded-2xl border border-line",
        count === 1 ? "grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-2"
      )}
    >
      {media.slice(0, 4).map((item, index) => {
        const isLastExtra = index === 3 && count > 4;
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group relative block overflow-hidden bg-surface-3",
              count === 1 ? "aspect-[16/10]" : "aspect-square",
              count === 3 && index === 0 && "col-span-2"
            )}
          >
            {item.type === "video" || item.mime.startsWith("video/") ? (
              <video src={item.url} controls preload="metadata" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.alt || "Post image"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.035]"
              />
            )}
            {isLastExtra && (
              <span className="absolute inset-0 flex items-center justify-center bg-midnight/60 text-xl font-bold text-white">
                +{count - 4}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

function PollBlock({
  post,
  onPost,
}: {
  post: FeedPostDTO;
  onPost: (next: FeedPostDTO) => void;
}) {
  const [pending, setPending] = React.useState<string | null>(null);
  if (!post.poll) return null;
  const { options, totalVotes, viewerOptionId } = post.poll;

  async function vote(optionId: string) {
    setPending(optionId);
    try {
      const data = await apiFetch<{ post: FeedPostDTO }>(`/api/v1/posts/${post.id}/poll`, {
        method: "POST",
        json: { optionId },
      });
      onPost(data.post);
    } catch (error) {
      toast({ title: "Vote failed", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {options.map((option) => {
        const pct = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
        const chosen = viewerOptionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => vote(option.id)}
            disabled={pending !== null}
            className={cn(
              "relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] font-medium transition",
              chosen ? "border-brand text-brand" : "border-line text-ink hover:border-brand/40"
            )}
          >
            <span
              className={cn("absolute inset-y-0 left-0 transition-all", chosen ? "bg-brand/15" : "bg-surface-3")}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <span className="relative flex items-center justify-between gap-3">
              <span>{option.text}</span>
              <span className="text-[12px] font-semibold text-ink-muted">{pct}%</span>
            </span>
          </button>
        );
      })}
      <p className="text-[11.5px] text-ink-faint">
        {formatCount(totalVotes)} {totalVotes === 1 ? "vote" : "votes"}
        {viewerOptionId ? " · Tap another option to change your vote" : ""}
      </p>
    </div>
  );
}

export function PostCard({
  post: initial,
  viewer,
  onUpdated,
  onDeleted,
  detail = false,
}: {
  post: FeedPostDTO;
  viewer: FeedViewer;
  onUpdated?: (post: FeedPostDTO) => void;
  onDeleted?: (id: string) => void;
  detail?: boolean;
}) {
  const [post, setPost] = React.useState(initial);
  const [reactOpen, setReactOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [translation, setTranslation] = React.useState<string | null>(null);
  const [translating, setTranslating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [pop, setPop] = React.useState<{ id: number; emoji: string } | null>(null);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => setPost(initial), [initial]);

  function update(next: FeedPostDTO) {
    setPost(next);
    onUpdated?.(next);
  }

  async function react(type: string) {
    setReactOpen(false);
    const emoji = REACTIONS.find((reaction) => reaction.type === type)?.emoji;
    if (emoji) setPop({ id: Date.now(), emoji });
    const prev = post;
    const same = post.viewerReaction === type;
    setPost({
      ...post,
      viewerReaction: same ? null : type,
      counts: { ...post.counts, reactions: Math.max(0, post.counts.reactions + (same ? -1 : post.viewerReaction ? 0 : 1)) },
    });
    try {
      const result = await apiFetch<{ reacted: boolean; type: string | null }>("/api/v1/reactions", {
        method: "POST",
        json: { targetType: "POST", targetId: post.id, type },
      });
      const next = {
        ...prev,
        viewerReaction: result.type,
        counts: {
          ...prev.counts,
          reactions: Math.max(0, prev.counts.reactions + (result.reacted ? (prev.viewerReaction ? 0 : 1) : -1)),
        },
      };
      update(next);
    } catch (error) {
      setPost(prev);
      toast({ title: "Reaction failed", description: errorMessage(error), variant: "error" });
    }
  }

  async function bookmark() {
    try {
      const result = await apiFetch<{ bookmarked: boolean }>(`/api/v1/posts/${post.id}/bookmark`, { method: "POST" });
      update({ ...post, viewerBookmarked: result.bookmarked });
      toast({ title: result.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks", variant: "success" });
    } catch (error) {
      toast({ title: "Could not update bookmark", description: errorMessage(error), variant: "error" });
    }
  }

  async function repost() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<{ post: FeedPostDTO }>(`/api/v1/posts/${post.id}/repost`, { method: "POST" });
      update({ ...post, counts: { ...post.counts, reposts: post.counts.reposts + 1 } });
      toast({ title: "Reposted to your profile", description: `Post ${data.post.id.slice(0, 6)} added to your feed.`, variant: "success" });
    } catch (error) {
      toast({ title: "Repost failed", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/posts/${post.id}`, { method: "DELETE" });
      toast({ title: "Post deleted", variant: "success" });
      onDeleted?.(post.id);
    } catch (error) {
      toast({ title: "Delete failed", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Post by @${post.author.username}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", variant: "success" });
    } catch {
      toast({ title: "Could not share", description: url, variant: "info" });
    }
  }

  async function translate() {
    if (translation) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    try {
      const target = navigator.language?.split("-")[0] || "en";
      const data = await apiFetch<{ text: string; provider: string }>("/api/v1/translate", {
        method: "POST",
        json: { text: post.body, targetLang: target, sourceType: "POST", sourceId: post.id },
      });
      if (data.text.trim() === post.body.trim()) {
        toast({ title: "Already in your language", variant: "info" });
        return;
      }
      setTranslation(data.text);
    } catch (error) {
      toast({ title: "Translation unavailable", description: errorMessage(error), variant: "warning" });
    } finally {
      setTranslating(false);
    }
  }

  const isOwner = post.author.id === viewer.id;
  const reactionEmoji = post.viewerReaction ? REACTION_EMOJI.get(post.viewerReaction) : null;
  const href = `/p/${post.id}`;

  return (
    <article className="surface-card card-lift p-4 hover:border-brand/30 sm:p-5">
      <header className="flex items-start gap-3">
        <Link href={`/profile/${post.author.username}`} aria-label={`@${post.author.username}`}>
          <Avatar src={post.author.avatarUrl} name={post.author.displayName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={`/profile/${post.author.username}`} className="truncate text-[14.5px] font-semibold text-ink hover:underline">
              {post.author.displayName}
            </Link>
            <BadgeCheck className={cn("h-4 w-4 text-ocean", post.author.verified ? "" : "hidden")} aria-label="Verified" />
            <span className="truncate text-[12.5px] text-ink-faint">@{post.author.username}</span>
            {post.author.countryCode && (
              <span className="text-[13px]" title={post.author.countryCode}>
                {flagEmoji(post.author.countryCode)}
              </span>
            )}
            <span className="text-ink-faint">·</span>
            {detail ? (
              <time className="text-[12px] text-ink-faint" dateTime={post.createdAt}>
                {timeAgo(post.createdAt)}
              </time>
            ) : (
              <Link href={href} className="text-[12px] text-ink-faint hover:underline">
                {timeAgo(post.createdAt)}
              </Link>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10.5px] text-ink-faint">
              {VISIBILITY_ICON[post.visibility] ?? <Globe2 className="h-3 w-3" />}
              {post.visibility === "PUBLIC"
                ? "Public"
                : post.visibility === "FOLLOWERS"
                  ? "Followers"
                  : "Community"}
            </span>
            {post.editedAt && <span className="text-[11px] text-ink-faint">edited</span>}
          </div>
          {post.community && (
            <Link href={`/communities/${post.community.slug}`} className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted hover:text-brand">
              in {post.community.name}
            </Link>
          )}
        </div>
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              aria-label="Post options"
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-surface-3 hover:text-ink"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          {(close) => (
            <div className="w-52">
              <MenuItem onClick={() => { close(); void share(); }} icon={<Link2 className="h-4 w-4" />}>
                Copy link
              </MenuItem>
              <MenuItem onClick={() => { close(); void translate(); }} icon={<Languages className="h-4 w-4" />}>
                {translation ? "Show original" : "Translate post"}
              </MenuItem>
              {isOwner ? (
                <>
                  <MenuDivider />
                  <MenuItem danger onClick={() => { close(); void remove(); }} icon={<Trash2 className="h-4 w-4" />}>
                    Delete post
                  </MenuItem>
                </>
              ) : (
                <>
                  <MenuDivider />
                  <MenuItem danger onClick={() => { close(); setReportOpen(true); }} icon={<Flag className="h-4 w-4" />}>
                    Report post
                  </MenuItem>
                </>
              )}
            </div>
          )}
        </Dropdown>
      </header>

      {post.body && (
        <div className="mt-3">
          <RichText text={translation ?? post.body} />
          {translation && <p className="mt-1.5 text-[11.5px] text-ink-faint">Translated</p>}
          {post.body.length > 280 && (
            <button
              type="button"
              onClick={translate}
              disabled={translating}
              className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted hover:text-brand"
            >
              <Languages className="h-3.5 w-3.5" /> {translating ? "Translating..." : translation ? "Original" : "Translate"}
            </button>
          )}
        </div>
      )}

      {post.repostOf && (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3 transition hover:border-brand/40">
          <Link href={`/p/${post.repostOf.id}`} className="flex items-center gap-2">
            <Avatar src={post.repostOf.author.avatarUrl} name={post.repostOf.author.displayName} size="xs" />
            <span className="text-[12.5px] font-semibold text-ink">{post.repostOf.author.displayName}</span>
            <span className="text-[11.5px] text-ink-faint">@{post.repostOf.author.username} · {timeAgo(post.repostOf.createdAt)}</span>
          </Link>
          {post.repostOf.body && <RichText text={post.repostOf.body.slice(0, 400)} className="mt-2 whitespace-pre-wrap text-[13.5px] leading-6 text-ink-muted" />}
          <MediaGrid media={post.repostOf.media} />
        </div>
      )}

      <MediaGrid media={post.media} />
      {post.poll && <PollBlock post={post} onPost={update} />}

      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 transition hover:border-brand/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Link2 className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-ink">{new URL(post.linkUrl).hostname}</span>
            <span className="block truncate text-[11.5px] text-ink-faint">{post.linkUrl}</span>
          </span>
        </a>
      )}

      <footer className="mt-3.5 flex items-center gap-0.5 border-t border-line pt-2.5">
        <div
          className="relative"
          onMouseLeave={() => {
            if (timer.current) window.clearTimeout(timer.current);
          }}
        >
          <button
            type="button"
            onClick={() => react("LIKE")}
            onMouseEnter={() => setReactOpen(true)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition hover:bg-surface-3",
              post.viewerReaction ? "text-brand" : "text-ink-muted"
            )}
            aria-label="React"
          >
            {pop && (
              <span key={pop.id} className="reaction-float" aria-hidden>
                {pop.emoji}
              </span>
            )}
            {reactionEmoji ? (
              <span key={post.viewerReaction ?? "none"} className="reaction-pop text-[15px] leading-none">
                {reactionEmoji}
              </span>
            ) : (
              <Smile className="h-4 w-4" />
            )}
            {formatCount(post.counts.reactions)}
          </button>
          {reactOpen && (
            <div className="absolute bottom-full left-0 z-30 mb-1 flex animate-scale-in gap-0.5 rounded-full border border-line bg-surface p-1 shadow-float">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction.type}
                  type="button"
                  onClick={() => react(reaction.type)}
                  title={reaction.label}
                  className="rounded-full p-1.5 text-lg leading-none transition hover:scale-125 hover:bg-surface-3"
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <Link href={href} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition hover:bg-surface-3">
          <MessageCircle className="h-4 w-4" /> {formatCount(post.counts.comments)}
        </Link>
        <button
          type="button"
          onClick={repost}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition hover:bg-surface-3 disabled:opacity-50"
        >
          <Repeat2 className="h-4 w-4" /> {formatCount(post.counts.reposts)}
        </button>
        <button
          type="button"
          onClick={bookmark}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition hover:bg-surface-3",
            post.viewerBookmarked ? "text-brand" : "text-ink-muted"
          )}
          aria-label={post.viewerBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <Bookmark className={cn("h-4 w-4", post.viewerBookmarked && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={share}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition hover:bg-surface-3"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </footer>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="POST" targetId={post.id} targetLabel="post" />
    </article>
  );
}
