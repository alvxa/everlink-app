"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client";
import { RichText } from "@/components/feed/rich-text";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import type { CommentDTO } from "@/lib/types";
import type { FeedViewer } from "@/components/feed/post-card";

function CommentRow({
  comment,
  viewer,
  postId,
  canReply,
}: {
  comment: CommentDTO;
  viewer: FeedViewer;
  postId: string;
  canReply: boolean;
}) {
  const [local, setLocal] = React.useState(comment);
  const [replying, setReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function react() {
    const active = local.viewerReaction;
    setLocal({ ...local, viewerReaction: active ? null : "LIKE" });
    try {
      await apiFetch("/api/v1/reactions", {
        method: "POST",
        json: { targetType: "COMMENT", targetId: local.id, type: "LIKE" },
      });
    } catch (error) {
      setLocal(comment);
      toast({ title: "Reaction failed", description: errorMessage(error), variant: "error" });
    }
  }

  async function remove() {
    if (!confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/comments/${local.id}`, { method: "DELETE" });
      setLocal({ ...local, body: "[deleted]", author: { ...local.author, displayName: "Deleted user", username: "deleted" } });
      toast({ title: "Comment deleted", variant: "success" });
    } catch (error) {
      toast({ title: "Could not delete comment", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();
    if (!replyText.trim() || busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<{ comment: CommentDTO }>(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        json: { body: replyText.trim(), parentId: local.id },
      });
      setLocal((prev) => ({ ...prev, replies: [...prev.replies, data.comment] }));
      setReplyText("");
      setReplying(false);
    } catch (error) {
      toast({ title: "Reply failed", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2.5">
      <Link href={`/profile/${local.author.username}`} className="shrink-0">
        <Avatar src={local.author.avatarUrl} name={local.author.displayName} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${local.author.username}`} className="text-[12.5px] font-semibold text-ink hover:underline">
              {local.author.displayName}
            </Link>
            <span className="text-[10.5px] text-ink-faint">{timeAgo(local.createdAt)}</span>
          </div>
          <RichText text={local.body} className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-ink-muted" />
        </div>
        <div className="mt-1 flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={react}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium transition hover:bg-surface-3",
              local.viewerReaction ? "text-brand" : "text-ink-faint"
            )}
          >
            <Heart className={cn("h-3 w-3", local.viewerReaction && "fill-current")} /> Like
          </button>
          {canReply && (
            <button
              type="button"
              onClick={() => setReplying((value) => !value)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-ink-faint transition hover:bg-surface-3"
            >
              <MessageCircle className="h-3 w-3" /> Reply
            </button>
          )}
          {viewer.id === local.author.id && local.body !== "[deleted]" && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-ink-faint transition hover:bg-surface-3 hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        {replying && (
          <form onSubmit={submitReply} className="mt-2 flex items-center gap-2">
            <input
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              maxLength={2000}
              autoFocus
              placeholder={`Reply to ${local.author.displayName.split(" ")[0]}...`}
              className="h-9 flex-1 rounded-full border border-line bg-surface px-3 text-[12.5px] text-ink outline-none focus:border-electric/60"
            />
            <button type="submit" disabled={busy || !replyText.trim()} aria-label="Send reply" className="rounded-full p-2 text-brand disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        )}

        {local.replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l border-line pl-3">
            {local.replies.map((reply) => (
              <CommentRow key={reply.id} comment={reply} viewer={viewer} postId={postId} canReply={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Comments({
  postId,
  initialComments,
  viewer,
  initialCount,
}: {
  postId: string;
  initialComments: CommentDTO[];
  viewer: FeedViewer;
  initialCount: number;
}) {
  const [comments, setComments] = React.useState(initialComments);
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ comment: CommentDTO }>(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        json: { body: body.trim() },
      });
      setComments((prev) => [...prev, data.comment]);
      setBody("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const total = initialCount + Math.max(0, comments.length - initialComments.length);

  return (
    <section className="surface-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <MessageCircle className="h-4 w-4 text-brand" /> Comments
        <span className="text-[12px] font-medium text-ink-faint">{formatCount(total)}</span>
      </h2>

      <form onSubmit={submit} className="mt-3 flex items-start gap-2.5">
        <Avatar src={viewer.avatarUrl} name={viewer.displayName} size="sm" />
        <div className="flex-1">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder="Add a thoughtful comment..."
            className="h-10 w-full rounded-full border border-line bg-surface-2 px-3.5 text-[13.5px] text-ink outline-none focus:border-electric/60"
          />
          {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
        </div>
        <button type="submit" disabled={pending || !body.trim()} aria-label="Send comment" className="rounded-full p-2.5 text-brand disabled:opacity-40">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      <div className="mt-4 space-y-4">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-faint">No comments yet. Start the conversation.</p>
        ) : (
          comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} viewer={viewer} postId={postId} canReply />
          ))
        )}
      </div>
    </section>
  );
}
