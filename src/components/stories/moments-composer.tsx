"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, Type, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { cn } from "@/lib/utils";

const BACKGROUNDS = ["#8057E8", "#2799E8", "#19BFA5", "#F59E0B", "#EF4444", "#EC4899", "#0F172A", "#111827"];

export function MomentsComposer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);
  const [type, setType] = React.useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [body, setBody] = React.useState("");
  const [background, setBackground] = React.useState(BACKGROUNDS[0]!);
  const [audience, setAudience] = React.useState<"PUBLIC" | "FOLLOWERS" | "CLOSE_FRIENDS">("PUBLIC");
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [mediaMime, setMediaMime] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setType("TEXT");
    setBody("");
    setBackground(BACKGROUNDS[0]!);
    setAudience("PUBLIC");
    setMediaUrl(null);
    setMediaMime(null);
    setError(null);
  }

  async function upload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Choose a photo or video file.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "STORY");
      const data = await apiUpload<{ upload: { url: string; mime: string } }>("/api/v1/uploads", form);
      setMediaUrl(data.upload.url);
      setMediaMime(data.upload.mime);
      setType(data.upload.mime.startsWith("video/") ? "VIDEO" : "IMAGE");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (type === "TEXT" && !body.trim()) return setError("Write something for your moment.");
    if (type !== "TEXT" && !mediaUrl) return setError("Add a photo or video first.");
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/v1/stories", {
        method: "POST",
        json: {
          type,
          mediaUrl: type === "TEXT" ? null : mediaUrl,
          body: body.trim(),
          background,
          audience,
        },
      });
      toast({ title: "Moment shared", description: "It disappears automatically after 24 hours.", variant: "success" });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Create moment
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
        title="New moment"
        description="Share a moment that lasts 24 hours."
        footer={
          <div className="flex items-center justify-between gap-3">
            <select
              aria-label="Moment audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as typeof audience)}
              className="h-9 rounded-xl border border-line bg-surface px-2.5 text-[12.5px] text-ink outline-none"
            >
              <option value="PUBLIC">Everyone</option>
              <option value="FOLLOWERS">Followers</option>
              <option value="CLOSE_FRIENDS">Close friends</option>
            </select>
            <Button form="create-moment" type="submit" loading={pending}>
              Share moment
            </Button>
          </div>
        }
      >
        <form id="create-moment" onSubmit={submit} className="space-y-4 px-5 py-4">
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(
              [
                { key: "TEXT", label: "Text", icon: Type },
                { key: "IMAGE", label: "Photo", icon: ImagePlus },
                { key: "VIDEO", label: "Video", icon: Video },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setType(option.key)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12.5px] font-semibold transition",
                  type === option.key ? "bg-surface text-brand shadow-sm" : "text-ink-muted hover:text-ink"
                )}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>

          {type === "TEXT" ? (
            <div className="rounded-2xl p-4" style={{ backgroundColor: background }}>
              <Textarea
                rows={4}
                maxLength={500}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What is happening right now?"
                className="border-none bg-transparent text-[16px] font-semibold text-white shadow-none placeholder:text-white/60 focus:ring-0"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-44 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-line bg-surface-2 text-ink-faint transition hover:border-brand/50 hover:text-brand"
              >
                {mediaUrl ? (
                  mediaMime?.startsWith("video/") ? (
                    <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="Moment preview" className="h-full w-full object-cover" />
                  )
                ) : uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[13px] font-medium">Add a photo or video</span>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => void upload(event.target.files?.[0] ?? null)}
              />
              <div>
                <Label htmlFor="moment-caption">Caption (optional)</Label>
                <Input
                  id="moment-caption"
                  value={body}
                  maxLength={500}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Say something about this"
                />
              </div>
            </div>
          )}

          {type === "TEXT" && (
            <div>
              <Label>Background</Label>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color} background`}
                    onClick={() => setBackground(color)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition",
                      background === color ? "border-ink" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}

