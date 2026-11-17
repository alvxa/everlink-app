"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  ImagePlus,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { COUNTRIES, REGIONS, countryName } from "@/lib/countries";
import { LANGUAGES } from "@/lib/constants";
import { flagEmoji, timeAgo } from "@/lib/utils";

/* ---------------------------------- Join ---------------------------------- */

export function JoinCommunityButton({
  slug,
  type,
  viewerRole,
  className,
  size = "md",
}: {
  slug: string;
  type: string;
  viewerRole: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [requested, setRequested] = React.useState(false);
  const [role, setRole] = React.useState(viewerRole);

  React.useEffect(() => setRole(viewerRole), [viewerRole]);

  async function act() {
    if (role) {
      if (role === "OWNER") {
        toast({ title: "Owners cannot leave their own community.", variant: "warning" });
        return;
      }
      if (!window.confirm("Leave this community?")) return;
    }
    setPending(true);
    try {
      if (role) {
        await apiFetch(`/api/v1/communities/${slug}`, { method: "DELETE" });
        setRole(null);
        toast({ title: "You left the community." });
      } else {
        const result = await apiFetch<{ joined?: boolean; requested?: boolean; requiresInvite?: boolean; pending?: boolean }>(
          `/api/v1/communities/${slug}`,
          { method: "POST" }
        );
        if (result.joined) {
          setRole("MEMBER");
          toast({ title: "Welcome aboard.", description: "You joined the community.", variant: "success" });
        } else if (result.requested) {
          setRequested(true);
          toast({ title: "Request sent", description: "An organizer will review it soon.", variant: "success" });
        } else if (result.pending) {
          setRequested(true);
          toast({ title: "Your request is already pending." });
        } else if (result.requiresInvite) {
          toast({ title: "This community is invite only.", variant: "warning" });
        }
      }
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update membership", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  if (!role && type === "PRIVATE") {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        <Lock className="h-4 w-4" /> Invite only
      </Button>
    );
  }

  if (!role && type === "RESTRICTED" && requested) {
    return (
      <Button variant="secondary" size={size} className={className} disabled>
        <Check className="h-4 w-4" /> Request pending
      </Button>
    );
  }

  if (role) {
    return (
      <Button variant="secondary" size={size} className={className} onClick={act} loading={pending}>
        {!pending && <LogOut className="h-4 w-4" />}
        {role === "OWNER" ? "Owner" : role === "MEMBER" ? "Leave" : "Leave"}
      </Button>
    );
  }

  return (
    <Button size={size} className={className} onClick={act} loading={pending}>
      {!pending && <UserPlus className="h-4 w-4" />}
      {type === "RESTRICTED" ? "Request to join" : "Join community"}
    </Button>
  );
}

/* ----------------------------- Create dialog ------------------------------ */

export function CreateCommunityDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    type: "PUBLIC" as "PUBLIC" | "PRIVATE" | "RESTRICTED",
    countryCode: "",
    language: "en",
    guidelines: "",
  });
  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setForm({ name: "", description: "", type: "PUBLIC", countryCode: "", language: "en", guidelines: "" });
    setImageUrl(null);
    setError(null);
  }

  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "AVATAR");
      const data = await apiUpload<{ upload: { url: string } }>("/api/v1/uploads", body);
      setImageUrl(data.upload.url);
    } catch (err) {
      toast({ title: "Image upload failed", description: errorMessage(err), variant: "error" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (form.name.trim().length < 3) return setError("Use a name of at least 3 characters.");
    if (form.description.trim().length < 10) return setError("Describe your community in at least 10 characters.");
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ community: { slug: string } }>("/api/v1/communities", {
        method: "POST",
        json: {
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          countryCode: form.countryCode || null,
          language: form.language,
          imageUrl,
          guidelines: form.guidelines.trim(),
        },
      });
      toast({ title: "Community created", variant: "success" });
      setOpen(false);
      reset();
      router.push(`/communities/${data.community.slug}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> New community
          </Button>
        )}
      </span>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
        title="Create a community"
        description="Bring people together around what they love."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="create-community" type="submit" loading={pending}>
              Create community
            </Button>
          </div>
        }
      >
        <form id="create-community" onSubmit={submit} className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-surface-2 text-ink-faint transition hover:border-brand/50 hover:text-brand"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Community" className="h-full w-full object-cover" />
              ) : uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
            </button>
            <div className="text-[12.5px] text-ink-muted">
              <p className="font-semibold text-ink">Community image</p>
              <p>Optional. JPG, PNG or WebP.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => void upload(event.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <Label htmlFor="community-name">Name</Label>
            <Input
              id="community-name"
              value={form.name}
              maxLength={60}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Slow Travel Photographers"
            />
          </div>

          <div>
            <Label htmlFor="community-description">Description</Label>
            <Textarea
              id="community-description"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What is this community about?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="community-type">Privacy</Label>
              <Select
                id="community-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as typeof form.type })}
              >
                <option value="PUBLIC">Public</option>
                <option value="RESTRICTED">Restricted (approval)</option>
                <option value="PRIVATE">Private (invite only)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="community-language">Main language</Label>
              <Select
                id="community-language"
                value={form.language}
                onChange={(event) => setForm({ ...form, language: event.target.value })}
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="community-country">Country (optional)</Label>
            <Select
              id="community-country"
              value={form.countryCode}
              onChange={(event) => setForm({ ...form, countryCode: event.target.value })}
            >
              <option value="">Global</option>
              {REGIONS.map((region) => (
                <optgroup key={region} label={region}>
                  {COUNTRIES.filter((country) => country.region === region).map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="community-guidelines">House rules (optional)</Label>
            <Textarea
              id="community-guidelines"
              rows={3}
              maxLength={5000}
              value={form.guidelines}
              onChange={(event) => setForm({ ...form, guidelines: event.target.value })}
              placeholder="How should members treat each other?"
            />
          </div>

          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}

/* ------------------------------ Invitations ------------------------------- */

export type InvitationView = {
  id: string;
  status: string;
  createdAt: string;
  community: { slug: string; name: string; imageUrl: string | null; type?: string };
  inviter: { username: string; displayName: string; avatarUrl: string | null };
  isRequest?: boolean;
};

export function InvitationsPanel({ invitations }: { invitations: InvitationView[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(invitations);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function respond(id: string, action: "ACCEPT" | "DECLINE") {
    setBusy(id + action);
    try {
      await apiFetch("/api/v1/community-invitations", { method: "PATCH", json: { invitationId: id, action } });
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: action === "ACCEPT" ? "Invitation accepted" : "Invitation declined",
        variant: action === "ACCEPT" ? "success" : "info",
      });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update invitation", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return null;

  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-brand" />
        <h2 className="text-[14px] font-semibold text-ink">Community invitations</h2>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <ul className="space-y-2">
        {items.map((invitation) => (
          <li key={invitation.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <Avatar src={invitation.community.imageUrl} name={invitation.community.name} size="sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/communities/${invitation.community.slug}`} className="block truncate text-[13.5px] font-semibold text-ink hover:text-brand">
                {invitation.community.name}
              </Link>
              <p className="truncate text-[11.5px] text-ink-faint">
                {invitation.isRequest
                  ? `Requested ${timeAgo(invitation.createdAt)}`
                  : `${invitation.inviter.displayName} invited you ${timeAgo(invitation.createdAt)}`}
              </p>
            </div>
            {invitation.isRequest ? (
              <Badge variant="ocean">Awaiting approval</Badge>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  loading={busy === invitation.id + "ACCEPT"}
                  onClick={() => respond(invitation.id, "ACCEPT")}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busy === invitation.id + "DECLINE"}
                  onClick={() => respond(invitation.id, "DECLINE")}
                >
                  Decline
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------- Invite ---------------------------------- */

export function InviteMemberDialog({ slug }: { slug: string }) {
  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/communities/${slug}/invite`, {
        method: "POST",
        json: { username: username.trim().replace(/^@/, "") },
      });
      toast({ title: "Invitation sent", variant: "success" });
      setUsername("");
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Invite
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Invite someone"
        description="They will receive a notification with your invitation."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="invite-member" type="submit" loading={pending}>
              Send invite
            </Button>
          </div>
        }
      >
        <form id="invite-member" onSubmit={submit} className="space-y-3 px-5 py-4">
          <div>
            <Label htmlFor="invite-username">Username</Label>
            <Input
              id="invite-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@username"
              autoFocus
            />
          </div>
          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}

/* --------------------------------- Events --------------------------------- */

export function CreateEventDialog({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    locationText: "",
    onlineUrl: "",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/communities/${slug}/events`, {
        method: "POST",
        json: {
          title: form.title.trim(),
          description: form.description.trim(),
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          locationText: form.locationText.trim() || null,
          onlineUrl: form.onlineUrl.trim() || null,
        },
      });
      toast({ title: "Event scheduled", variant: "success" });
      setForm({ title: "", description: "", startsAt: "", endsAt: "", locationText: "", onlineUrl: "" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Event
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Schedule an event"
        description="Members will see it on the community page."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="create-event" type="submit" loading={pending}>
              Create event
            </Button>
          </div>
        }
      >
        <form id="create-event" onSubmit={submit} className="space-y-3 px-5 py-4">
          <div>
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={form.title}
              maxLength={100}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Weekend photo walk"
            />
          </div>
          <div>
            <Label htmlFor="event-description">Details</Label>
            <Textarea
              id="event-description"
              rows={3}
              maxLength={1000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What should people expect?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="event-starts">Starts</Label>
              <Input
                id="event-starts"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="event-ends">Ends (optional)</Label>
              <Input
                id="event-ends"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="event-location">Location (optional)</Label>
            <Input
              id="event-location"
              value={form.locationText}
              maxLength={200}
              onChange={(event) => setForm({ ...form, locationText: event.target.value })}
              placeholder="City, venue or Online"
            />
          </div>
          <div>
            <Label htmlFor="event-url">Online link (optional)</Label>
            <Input
              id="event-url"
              type="url"
              value={form.onlineUrl}
              maxLength={300}
              onChange={(event) => setForm({ ...form, onlineUrl: event.target.value })}
              placeholder="https://"
            />
          </div>
          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}

/* ----------------------------- Edit community ------------------------------ */

export function EditCommunityDialog({
  slug,
  initial,
}: {
  slug: string;
  initial: {
    name: string;
    description: string;
    type: string;
    guidelines: string;
    countryCode: string | null;
    imageUrl: string | null;
    coverUrl: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: initial.name,
    description: initial.description,
    type: initial.type,
    guidelines: initial.guidelines,
    countryCode: initial.countryCode ?? "",
    imageUrl: initial.imageUrl,
    coverUrl: initial.coverUrl,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/communities/${slug}`, {
        method: "PATCH",
        json: {
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          guidelines: form.guidelines,
          countryCode: form.countryCode || null,
          imageUrl: form.imageUrl,
          coverUrl: form.coverUrl,
        },
      });
      toast({ title: "Community updated", variant: "success" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Edit
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit community"
        description="Changes are visible to everyone immediately."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="edit-community" type="submit" loading={pending}>
              Save changes
            </Button>
          </div>
        }
      >
        <form id="edit-community" onSubmit={submit} className="space-y-4 px-5 py-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={form.name} maxLength={60} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-type">Privacy</Label>
              <Select id="edit-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="PUBLIC">Public</option>
                <option value="RESTRICTED">Restricted</option>
                <option value="PRIVATE">Private</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-country">Country</Label>
              <Select
                id="edit-country"
                value={form.countryCode}
                onChange={(event) => setForm({ ...form, countryCode: event.target.value })}
              >
                <option value="">Global</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-guidelines">House rules</Label>
            <Textarea
              id="edit-guidelines"
              rows={4}
              maxLength={5000}
              value={form.guidelines}
              onChange={(event) => setForm({ ...form, guidelines: event.target.value })}
            />
          </div>
          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </Dialog>
    </>
  );
}

/* ------------------------------ Member manager ----------------------------- */

export type CommunityMemberView = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  countryCode: string | null;
  role: string;
  joinedAt: string;
};

export function MemberManager({
  slug,
  members,
  isOwner,
}: {
  slug: string;
  members: CommunityMemberView[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function changeRole(userId: string, role: string) {
    setBusy(userId);
    try {
      await apiFetch(`/api/v1/communities/${slug}/members`, { method: "PATCH", json: { userId, role } });
      toast({ title: "Role updated", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update role", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(userId: string) {
    if (!window.confirm("Remove this member from the community?")) return;
    setBusy(userId);
    try {
      await apiFetch(`/api/v1/communities/${slug}/members`, { method: "DELETE", json: { userId } });
      toast({ title: "Member removed" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not remove member", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="divide-y divide-line">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3 py-2.5">
          <Avatar src={member.avatarUrl} name={member.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${member.username}`} className="block truncate text-[13px] font-semibold text-ink hover:text-brand">
              {member.displayName}
            </Link>
            <p className="truncate text-[11px] text-ink-faint">
              @{member.username} · joined {timeAgo(member.joinedAt)}
            </p>
          </div>
          {member.role === "OWNER" ? (
            <Badge variant="mint">
              <Shield className="h-3 w-3" /> Owner
            </Badge>
          ) : (
            <>
              <Select
                aria-label={`Role for ${member.displayName}`}
                value={member.role}
                disabled={busy === member.id || (member.role === "ADMIN" && !isOwner)}
                onChange={(event) => changeRole(member.id, event.target.value)}
                className="h-8 w-[118px] px-2 text-[12px]"
              >
                <option value="MEMBER">Member</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN" disabled={!isOwner}>
                  Admin
                </option>
              </Select>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${member.displayName}`}
                disabled={busy === member.id || (member.role === "ADMIN" && !isOwner)}
                onClick={() => remove(member.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- Pending requests ----------------------------- */

export type JoinRequestView = {
  id: string;
  createdAt: string;
  invitee: { username: string; displayName: string; avatarUrl: string | null };
};

export function JoinRequests({ requests }: { requests: JoinRequestView[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(requests);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => setItems(requests), [requests]);

  async function respond(id: string, action: "ACCEPT" | "DECLINE") {
    setBusy(id + action);
    try {
      await apiFetch("/api/v1/community-invitations", { method: "PATCH", json: { invitationId: id, action } });
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast({ title: action === "ACCEPT" ? "Request approved" : "Request declined", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not review request", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) {
    return <p className="text-[12.5px] text-ink-muted">No pending join requests.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((request) => (
        <li key={request.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5">
          <Avatar src={request.invitee.avatarUrl} name={request.invitee.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{request.invitee.displayName}</p>
            <p className="truncate text-[11px] text-ink-faint">
              @{request.invitee.username} · {timeAgo(request.createdAt)}
            </p>
          </div>
          <Button size="sm" loading={busy === request.id + "ACCEPT"} onClick={() => respond(request.id, "ACCEPT")}>
            Approve
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Decline request"
            loading={busy === request.id + "DECLINE"}
            onClick={() => respond(request.id, "DECLINE")}
          >
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function CommunityBadges({ type, countryCode }: { type: string; countryCode?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={type === "PUBLIC" ? "mint" : type === "PRIVATE" ? "danger" : "ocean"}>
        {type === "PUBLIC" ? "Public" : type === "PRIVATE" ? "Private" : "Restricted"}
      </Badge>
      {countryCode && (
        <Badge variant="outline">
          {flagEmoji(countryCode)} {countryName(countryCode)}
        </Badge>
      )}
    </div>
  );
}
