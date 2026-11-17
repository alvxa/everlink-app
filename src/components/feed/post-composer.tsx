"use client";

import * as React from "react";
import { ImagePlus, Link2, ListPlus, Loader2, MapPin, Send, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { MAX_POST_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CommunityDTO, FeedPostDTO } from "@/lib/types";
import type { FeedViewer } from "@/components/feed/post-card";

type UploadedMedia = { url: string; mime: string; type: "image" | "video" };

export function PostComposer({
  viewer,
  defaultCommunityId,
  defaultCountryCode,
  onCreated,
  compact = false,
}: {
  viewer: FeedViewer;
  defaultCommunityId?: string;
  defaultCountryCode?: string | null;
  onCreated?: (post: FeedPostDTO) => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(!compact);
  const [body, setBody] = React.useState("");
  const [media, setMedia] = React.useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = React.useState(0);
  const [pollOpen, setPollOpen] = React.useState(false);
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""]);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [communityId, setCommunityId] = React.useState(defaultCommunityId ?? "");
  const [visibility, setVisibility] = React.useState<"PUBLIC" | "FOLLOWERS">("PUBLIC");
  const [attachCountry, setAttachCountry] = React.useState(Boolean(defaultCountryCode));
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [communities, setCommunities] = React.useState<CommunityDTO[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const textRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    let active = true;
    apiFetch<{ communities: CommunityDTO[] }>("/api/v1/communities?joined=1&limit=48")
      .then((data) => {
        if (active) setCommunities(data.communities);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 4 - media.length;
    const selected = Array.from(files).slice(0, Math.max(0, remaining));
    setUploading(selected.length);
    for (const file of selected) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "POST");
        const data = await apiUpload<{ upload: { url: string; mime: string } }>("/api/v1/uploads", form);
        const type = data.upload.mime.startsWith("video/") ? "video" : "image";
        setMedia((prev) => [...prev, { url: data.upload.url, mime: data.upload.mime, type }]);
      } catch (err) {
        toast({ title: "Upload failed", description: errorMessage(err), variant: "error" });
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function reset() {
    setBody("");
    setMedia([]);
    setPollOptions(["", ""]);
    setPollOpen(false);
    setLinkUrl("");
    setLinkOpen(false);
    setError(null);
    setAttachCountry(false);
    if (compact) setExpanded(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!body.trim() && !media.length && !linkUrl && !pollOpen) {
      setError("Write something or add media before posting.");
      return;
    }
    if (pollOpen && pollOptions.filter((option) => option.trim()).length < 2) {
      setError("Add at least two poll options.");
      return;
    }
    setPending(true);
    try {
      const payload = {
        body: body.trim(),
        visibility: communityId ? "COMMUNITY" : visibility,
        communityId: communityId || null,
        linkUrl: linkOpen && linkUrl.trim() ? linkUrl.trim() : null,
        countryCode: attachCountry && defaultCountryCode ? defaultCountryCode : null,
        media: media.map((item) => ({ url: item.url, mime: item.mime, type: item.type })),
        pollOptions: pollOpen ? pollOptions.map((option) => option.trim()).filter(Boolean) : undefined,
        type: pollOpen
          ? "POLL"
          : media.length
            ? media[0]?.type === "video"
              ? "VIDEO"
              : "IMAGE"
            : linkOpen && linkUrl
              ? "LINK"
              : "TEXT",
      };
      const data = await apiFetch<{ post: FeedPostDTO }>("/api/v1/posts", { method: "POST", json: payload });
      onCreated?.(data.post);
      toast({ title: "Posted", variant: "success" });
      reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={cn("surface-card p-3.5 sm:p-4", compact && !expanded && "cursor-text")}>
      <div className="flex gap-3">
        <Avatar src={viewer.avatarUrl} name={viewer.displayName} size="md" />
        <div className="min-w-0 flex-1">
          <textarea
            ref={textRef}
            value={body}
            onFocus={() => setExpanded(true)}
            onChange={(event) => setBody(event.target.value)}
            rows={expanded ? 3 : 1}
            maxLength={MAX_POST_LENGTH}
            placeholder="What's on your mind?"
            className="w-full resize-none bg-transparent pt-2 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-faint"
          />
          {!expanded && <span className="sr-only">Write a post</span>}

          {media.length > 0 && (
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {media.map((item, index) => (
                <div key={item.url} className="relative overflow-hidden rounded-xl border border-line bg-surface-3">
                  {item.type === "video" ? (
                    <video src={item.url} className="aspect-video w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="Upload preview" className="aspect-video w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Remove attachment"
                    className="absolute right-1.5 top-1.5 rounded-full bg-midnight/70 p-1 text-white hover:bg-midnight"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {uploading > 0 && (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line bg-surface-2">
                  <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
                </div>
              )}
            </div>
          )}

          {pollOpen && (
            <div className="mb-2 space-y-2 rounded-xl border border-line bg-surface-2 p-3">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-4 text-[12px] font-semibold text-ink-faint">{index + 1}</span>
                  <input
                    value={option}
                    onChange={(event) =>
                      setPollOptions((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))
                    }
                    maxLength={100}
                    placeholder={`Option ${index + 1}`}
                    className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink outline-none focus:border-electric/60"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg p-1.5 text-ink-faint hover:text-red-500"
                      aria-label="Remove option"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ""])}
                  className="text-[12.5px] font-semibold text-brand hover:underline"
                >
                  Add option
                </button>
              )}
            </div>
          )}

          {linkOpen && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
              <Link2 className="h-4 w-4 text-ink-faint" />
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                type="url"
                placeholder="https://..."
                className="h-10 flex-1 bg-transparent text-[13.5px] text-ink outline-none"
              />
            </div>
          )}

          {expanded && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(event) => uploadFiles(event.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={media.length >= 4}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition hover:bg-surface-3 disabled:opacity-40"
                >
                  <ImagePlus className="h-4 w-4 text-mint" /> Photo
                </button>
                <button
                  type="button"
                  onClick={() => setPollOpen((value) => !value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition hover:bg-surface-3",
                    pollOpen ? "text-brand" : "text-ink-muted"
                  )}
                >
                  <ListPlus className="h-4 w-4 text-ocean" /> Poll
                </button>
                <button
                  type="button"
                  onClick={() => setLinkOpen((value) => !value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition hover:bg-surface-3",
                    linkOpen ? "text-brand" : "text-ink-muted"
                  )}
                >
                  <Link2 className="h-4 w-4 text-electric" /> Link
                </button>
                {defaultCountryCode && (
                  <button
                    type="button"
                    onClick={() => setAttachCountry((value) => !value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition hover:bg-surface-3",
                      attachCountry ? "text-brand" : "text-ink-muted"
                    )}
                  >
                    <MapPin className="h-4 w-4 text-amber-500" /> {defaultCountryCode}
                  </button>
                )}
                <span className="ml-auto text-[11.5px] tabular-nums text-ink-faint">
                  {body.length}/{MAX_POST_LENGTH}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                <select
                  value={communityId}
                  onChange={(event) => setCommunityId(event.target.value)}
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-[12px] font-medium text-ink-muted outline-none"
                  aria-label="Post audience"
                >
                  <option value="">Everyone (follows your privacy setting)</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
                {!communityId && (
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as "PUBLIC" | "FOLLOWERS")}
                    className="h-8 rounded-lg border border-line bg-surface px-2 text-[12px] font-medium text-ink-muted outline-none"
                    aria-label="Visibility"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="FOLLOWERS">Followers only</option>
                  </select>
                )}
                {communityId && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-faint">
                    <Users className="h-3.5 w-3.5" /> Community post
                  </span>
                )}
                <Button type="submit" size="sm" className="ml-auto" loading={pending}>
                  <Send className="h-3.5 w-3.5" /> Post
                </Button>
              </div>
              {error && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
            </>
          )}
        </div>
      </div>
      {!expanded && (
        <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
          <button type="button" onClick={() => { setExpanded(true); fileRef.current?.click(); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted hover:bg-surface-3">
            <ImagePlus className="h-4 w-4 text-mint" /> Photo
          </button>
          <button type="button" onClick={() => { setExpanded(true); setPollOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted hover:bg-surface-3">
            <ListPlus className="h-4 w-4 text-ocean" /> Poll
          </button>
          <button type="button" onClick={() => { setExpanded(true); setLinkOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-muted hover:bg-surface-3">
            <Link2 className="h-4 w-4 text-electric" /> Link
          </button>
        </div>
      )}
    </form>
  );
}
