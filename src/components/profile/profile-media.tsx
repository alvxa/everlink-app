"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { cn } from "@/lib/utils";

export type ProfileMediaData = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  countryCode: string | null;
  website: string | null;
  pronouns: string | null;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function useMediaUpload(profile: ProfileMediaData, kind: "avatar" | "cover") {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind === "avatar" ? "AVATAR" : "COVER");
      const result = await apiUpload<{ upload: { url: string } }>("/api/v1/uploads", form);
      await apiFetch("/api/v1/settings/profile", {
        method: "PATCH",
        json: {
          displayName: profile.displayName,
          bio: profile.bio,
          countryCode: profile.countryCode,
          website: profile.website || null,
          pronouns: profile.pronouns,
          [kind === "avatar" ? "avatarUrl" : "coverUrl"]: result.upload.url,
        },
      });
      setPreview(result.upload.url);
      toast({
        title: kind === "avatar" ? "Profile picture updated" : "Cover photo updated",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({ title: "Upload failed", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return { inputRef, preview, busy, onChange, open: () => inputRef.current?.click() };
}

export function ProfileCoverUploader({ profile, isSelf }: { profile: ProfileMediaData; isSelf: boolean }) {
  const media = useMediaUpload(profile, "cover");
  const src = media.preview ?? profile.coverUrl;

  return (
    <div className="group relative h-36 w-full overflow-hidden bg-gradient-to-r from-fuchsia-500/70 via-electric/60 to-ocean/60 bg-[length:220%_220%] animate-gradient-flow sm:h-44">
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#06070f]/80 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {isSelf && (
        <>
          <button
            type="button"
            onClick={media.open}
            disabled={media.busy}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/45 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-md transition hover:bg-black/65 active:scale-95 disabled:opacity-70"
          >
            {media.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {media.busy ? "Uploading" : "Change cover"}
          </button>
          <input ref={media.inputRef} type="file" accept={ACCEPT} hidden onChange={media.onChange} />
        </>
      )}
    </div>
  );
}

export function ProfileAvatarUploader({ profile, isSelf }: { profile: ProfileMediaData; isSelf: boolean }) {
  const media = useMediaUpload(profile, "avatar");
  const src = media.preview ?? profile.avatarUrl;

  return (
    <div className="group relative z-10 shrink-0">
      <Avatar src={src} name={profile.displayName} size="2xl" className="ring-4 ring-surface-2" />
      {isSelf && (
        <>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Camera className="h-6 w-6" />
          </span>
          <button
            type="button"
            onClick={media.open}
            disabled={media.busy}
            aria-label="Change profile picture"
            className={cn(
              "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full",
              "bg-gradient-to-br from-electric to-ocean text-white shadow-glow ring-2 ring-surface-2",
              "transition-transform duration-200 hover:scale-110 active:scale-95 disabled:opacity-70"
            )}
          >
            {media.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={media.inputRef} type="file" accept={ACCEPT} hidden onChange={media.onChange} />
        </>
      )}
    </div>
  );
}
