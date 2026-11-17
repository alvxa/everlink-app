"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  Download,
  KeyRound,
  Loader2,
  Monitor,
  Save,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PushToggle } from "@/components/settings/push-toggle";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { INTERESTS, LANGUAGES, MAX_BIO_LENGTH } from "@/lib/constants";
import { COUNTRIES } from "@/lib/countries";
import { cn, timeAgo } from "@/lib/utils";

type Settings = {
  discoverable: boolean;
  showCountry: boolean;
  showOnlineStatus: boolean;
  allowRandomConnect: boolean;
  allowGroupInvites: boolean;
  messagePrivacy: "EVERYONE" | "FRIENDS";
  connectTopics: string[];
  connectLanguage: string | null;
  emailNotifications: boolean;
  notifyFollows: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyMessages: boolean;
  notifyCommunities: boolean;
  notifyLive: boolean;
};

type ProfileInput = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  countryCode: string | null;
  website: string | null;
  pronouns: string | null;
};

type Session = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

const SECTIONS = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "privacy", label: "Privacy", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: KeyRound },
  { key: "sessions", label: "Sessions", icon: Monitor },
  { key: "data", label: "Your data", icon: Download },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function SettingsScreen({
  username,
  email,
  profile,
  settings,
  interests,
  languages,
  twoFactorEnabled,
}: {
  username: string;
  email: string;
  profile: ProfileInput;
  settings: Settings;
  interests: string[];
  languages: string[];
  twoFactorEnabled: boolean;
}) {
  const [section, setSection] = React.useState<SectionKey>("profile");

  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    if (requested && SECTIONS.some((item) => item.key === requested)) {
      setSection(requested as SectionKey);
    }
  }, []);

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="icon-tile h-10 w-10 rounded-2xl">
          <SlidersHorizontal className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink">Settings</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">Control your profile, privacy and account security.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[210px_1fr]">
        <nav className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Settings sections">
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition",
                section === item.key
                  ? "bg-gradient-to-r from-electric/20 to-ocean/10 text-ink shadow-[inset_0_0_0_1px_rgba(167,139,250,.35)] dark:from-electric/30 dark:text-white"
                  : "text-ink-muted hover:bg-surface-3 hover:text-ink dark:hover:bg-white/[0.05]"
              )}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "profile" && <ProfileSection username={username} profile={profile} initialInterests={interests} initialLanguages={languages} />}
          {section === "privacy" && <PrivacySection initial={settings} username={username} />}
          {section === "notifications" && <NotificationsSection initial={settings} email={email} />}
          {section === "security" && <SecuritySection twoFactorEnabled={twoFactorEnabled} email={email} />}
          {section === "sessions" && <SessionsSection />}
          {section === "data" && <DataSection username={username} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({
  username,
  profile,
  initialInterests,
  initialLanguages,
}: {
  username: string;
  profile: ProfileInput;
  initialInterests: string[];
  initialLanguages: string[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(profile);
  const [interests, setInterests] = React.useState<string[]>(initialInterests);
  const [languages, setLanguages] = React.useState<string[]>(initialLanguages);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState<"avatar" | "cover" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);
  const coverRef = React.useRef<HTMLInputElement>(null);

  async function upload(kind: "avatar" | "cover", file?: File) {
    if (!file) return;
    setUploading(kind);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", kind === "avatar" ? "AVATAR" : "COVER");
      const result = await apiUpload<{ upload: { url: string } }>("/api/v1/uploads", data);
      setForm((prev) => ({ ...prev, [kind === "avatar" ? "avatarUrl" : "coverUrl"]: result.upload.url }));
    } catch (err) {
      toast({ title: "Upload failed", description: errorMessage(err), variant: "error" });
    } finally {
      setUploading(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/settings/profile", {
        method: "PATCH",
        json: {
          displayName: form.displayName,
          bio: form.bio,
          avatarUrl: form.avatarUrl,
          coverUrl: form.coverUrl,
          countryCode: form.countryCode,
          website: form.website || null,
          pronouns: form.pronouns || null,
        },
      });
      await apiFetch("/api/v1/settings/profile", {
        method: "POST",
        json: { interests, languages },
      });
      toast({ title: "Profile updated", variant: "success" });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="surface-card overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-fuchsia-500/60 via-electric/50 to-ocean/50">
          {form.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.coverUrl} alt="Profile cover" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-midnight/60 px-2.5 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur hover:bg-midnight/80"
          >
            {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Cover
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(event) => upload("cover", event.target.files?.[0])} />
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-8 flex items-end gap-3">
            <div className="relative">
              <Avatar src={form.avatarUrl} name={form.displayName} size="xl" className="ring-4 ring-surface" />
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                aria-label="Change avatar"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-electric text-white ring-2 ring-surface"
              >
                {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="pb-1 text-[12.5px] text-ink-faint">@{username}</p>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(event) => upload("avatar", event.target.files?.[0])} />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                maxLength={50}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                required
                minLength={2}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                placeholder="Tell the world who you are and what you love."
              />
              <p className="mt-1 text-right text-[11px] text-ink-faint">{form.bio.length}/{MAX_BIO_LENGTH}</p>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                value={form.countryCode ?? ""}
                onChange={(event) => setForm({ ...form, countryCode: event.target.value || null })}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-electric/60"
              >
                <option value="">Prefer not to say</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pronouns">Pronouns</Label>
              <Input
                id="pronouns"
                value={form.pronouns ?? ""}
                maxLength={30}
                onChange={(event) => setForm({ ...form, pronouns: event.target.value || null })}
                placeholder="they/them"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website ?? ""}
                maxLength={200}
                onChange={(event) => setForm({ ...form, website: event.target.value || null })}
                placeholder="https://your-site.com"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-[14px] font-semibold text-ink">Interests</h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">Pick up to 15. They help people find you and power recommendations.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {INTERESTS.map((interest) => {
            const active = interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() =>
                  setInterests((prev) =>
                    active ? prev.filter((item) => item !== interest) : prev.length < 15 ? [...prev, interest] : prev
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted hover:border-brand/40"
                )}
              >
                {interest}
              </button>
            );
          })}
        </div>
        <h2 className="mt-5 text-[14px] font-semibold text-ink">Languages</h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">Pick up to 10 languages you speak.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {LANGUAGES.map((language) => {
            const active = languages.includes(language.code);
            return (
              <button
                key={language.code}
                type="button"
                onClick={() =>
                  setLanguages((prev) =>
                    active ? prev.filter((item) => item !== language.code) : prev.length < 10 ? [...prev, language.code] : prev
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted hover:border-brand/40"
                )}
              >
                {language.label}
              </button>
            );
          })}
        </div>
      </section>

      <FieldError>{error}</FieldError>
      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={interests.length === 0 || languages.length === 0}>
          <Save className="h-4 w-4" /> Save profile
        </Button>
      </div>
    </form>
  );
}

function PrivacySection({ initial, username }: { initial: Settings; username: string }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/v1/settings", {
        method: "PATCH",
        json: {
          discoverable: form.discoverable,
          showCountry: form.showCountry,
          showOnlineStatus: form.showOnlineStatus,
          allowRandomConnect: form.allowRandomConnect,
          allowGroupInvites: form.allowGroupInvites,
          messagePrivacy: form.messagePrivacy,
          connectLanguage: form.connectLanguage,
          connectTopics: form.connectTopics,
        },
      });
      toast({ title: "Privacy settings saved", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not save", description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <h2 className="text-[14px] font-semibold text-ink">Visibility</h2>
        <div className="mt-3 space-y-3">
          <Toggle
            label="Appear in discovery"
            description="Let people find you in Explore and suggestions."
            checked={form.discoverable}
            onChange={(value) => setForm({ ...form, discoverable: value })}
          />
          <Toggle
            label="Show my country"
            description="Display your country flag on your profile."
            checked={form.showCountry}
            onChange={(value) => setForm({ ...form, showCountry: value })}
          />
          <Toggle
            label="Show online status"
            description="Let others see when you are active. Messages still arrive when offline."
            checked={form.showOnlineStatus}
            onChange={(value) => setForm({ ...form, showOnlineStatus: value })}
          />
        </div>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-[14px] font-semibold text-ink">Messaging</h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">Who can start a direct conversation with you.</p>
        <select
          value={form.messagePrivacy}
          onChange={(event) => setForm({ ...form, messagePrivacy: event.target.value as "EVERYONE" | "FRIENDS" })}
          className="mt-2 h-10 w-full max-w-xs rounded-xl border border-line bg-surface px-3 text-[13.5px] text-ink outline-none"
        >
          <option value="EVERYONE">Everyone</option>
          <option value="FRIENDS">Friends only</option>
        </select>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-[14px] font-semibold text-ink">Random Connect</h2>
        <div className="mt-3 space-y-3">
          <Toggle
            label="Allow Random Connect"
            description="Match with new people for short, safe conversations."
            checked={form.allowRandomConnect}
            onChange={(value) => setForm({ ...form, allowRandomConnect: value })}
          />
          <Toggle
            label="Allow group invites"
            description="Let friends add you to group conversations."
            checked={form.allowGroupInvites}
            onChange={(value) => setForm({ ...form, allowGroupInvites: value })}
          />
          <div>
            <Label htmlFor="connectLanguage">Preferred matching language (optional)</Label>
            <select
              id="connectLanguage"
              value={form.connectLanguage ?? ""}
              onChange={(event) => setForm({ ...form, connectLanguage: event.target.value || null })}
              className="h-10 w-full max-w-xs rounded-xl border border-line bg-surface px-3 text-[13.5px] text-ink outline-none"
            >
              <option value="">Any language</option>
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">Favorite connect topics</p>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.slice(0, 16).map((interest) => {
                const active = form.connectTopics.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        connectTopics: active
                          ? form.connectTopics.filter((item) => item !== interest)
                          : form.connectTopics.length < 10
                            ? [...form.connectTopics, interest]
                            : form.connectTopics,
                      })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition",
                      active ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted"
                    )}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" /> Save privacy settings
        </Button>
      </div>
      <p className="text-right text-[11.5px] text-ink-faint">Signed in as @{username}</p>
    </div>
  );
}

function NotificationsSection({ initial, email }: { initial: Settings; email: string }) {
  const [form, setForm] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/v1/settings", {
        method: "PATCH",
        json: {
          emailNotifications: form.emailNotifications,
          notifyFollows: form.notifyFollows,
          notifyLikes: form.notifyLikes,
          notifyComments: form.notifyComments,
          notifyMessages: form.notifyMessages,
          notifyCommunities: form.notifyCommunities,
          notifyLive: form.notifyLive,
        },
      });
      toast({ title: "Notification preferences saved", variant: "success" });
    } catch (error) {
      toast({ title: "Could not save", description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const items: { key: keyof Settings; label: string; description: string }[] = [
    { key: "notifyFollows", label: "Follows and friend requests", description: "New followers and friend activity." },
    { key: "notifyLikes", label: "Reactions", description: "When someone reacts to your posts or comments." },
    { key: "notifyComments", label: "Comments and mentions", description: "Replies, comments and @mentions." },
    { key: "notifyMessages", label: "Direct messages", description: "New messages in your conversations." },
    { key: "notifyCommunities", label: "Communities", description: "Invitations and community updates." },
    { key: "notifyLive", label: "Live rooms", description: "Invitations to live rooms." },
  ];

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <h2 className="text-[14px] font-semibold text-ink">In-app notifications</h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">Choose what appears in your notification feed.</p>
        <div className="mt-3 divide-y divide-line">
          {items.map((item) => (
            <div key={item.key} className="py-3 first:pt-1">
              <Toggle
                label={item.label}
                description={item.description}
                checked={Boolean(form[item.key])}
                onChange={(value) => setForm({ ...form, [item.key]: value })}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="surface-card p-4">
        <PushToggle />
      </section>
      <section className="surface-card p-4">
        <Toggle
          label="Email notifications"
          description={`Security and account email is sent to ${email}. Product email respects this switch.`}
          checked={form.emailNotifications}
          onChange={(value) => setForm({ ...form, emailNotifications: value })}
        />
      </section>
      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" /> Save notifications
        </Button>
      </div>
    </div>
  );
}

function SecuritySection({ twoFactorEnabled, email }: { twoFactorEnabled: boolean; email: string }) {
  const [passwordForm, setPasswordForm] = React.useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [enabled, setEnabled] = React.useState(twoFactorEnabled);
  const [setup, setSetup] = React.useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null);
  const [twoFactorPending, setTwoFactorPending] = React.useState(false);
  const [disableForm, setDisableForm] = React.useState({ password: "", code: "" });

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await apiFetch("/api/v1/settings/password", {
        method: "POST",
        json: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          revokeOthers: true,
        },
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast({ title: "Password changed", description: "Other sessions were signed out.", variant: "success" });
    } catch (error) {
      setPasswordError(errorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  async function beginSetup() {
    setTwoFactorPending(true);
    try {
      const data = await apiFetch<{ secret: string; qrDataUrl: string }>("/api/v1/auth/2fa/setup", { method: "POST" });
      setSetup(data);
    } catch (error) {
      toast({ title: "Could not start 2FA setup", description: errorMessage(error), variant: "error" });
    } finally {
      setTwoFactorPending(false);
    }
  }

  async function enable(event: React.FormEvent) {
    event.preventDefault();
    setTwoFactorPending(true);
    try {
      const data = await apiFetch<{ recoveryCodes: string[] }>("/api/v1/auth/2fa/enable", {
        method: "POST",
        json: { code },
      });
      setEnabled(true);
      setSetup(null);
      setCode("");
      setRecoveryCodes(data.recoveryCodes);
    } catch (error) {
      toast({ title: "Could not enable 2FA", description: errorMessage(error), variant: "error" });
    } finally {
      setTwoFactorPending(false);
    }
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setTwoFactorPending(true);
    try {
      await apiFetch("/api/v1/auth/2fa/disable", { method: "POST", json: disableForm });
      setEnabled(false);
      setDisableForm({ password: "", code: "" });
      toast({ title: "Two-factor disabled", variant: "success" });
    } catch (error) {
      toast({ title: "Could not disable 2FA", description: errorMessage(error), variant: "error" });
    } finally {
      setTwoFactorPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <KeyRound className="h-4 w-4 text-brand" /> Change password
        </h2>
        <form onSubmit={changePassword} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={passwordForm.confirm}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
              required
            />
          </div>
          <p className="text-[11.5px] text-ink-faint sm:col-span-2">Use at least 10 characters with letters and numbers.</p>
          <FieldError>{passwordError}</FieldError>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" loading={savingPassword}>
              Update password
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-card p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          {enabled ? <ShieldCheck className="h-4 w-4 text-mint" /> : <ShieldOff className="h-4 w-4 text-ink-faint" />} Two-factor authentication
        </h2>
        <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
          {enabled
            ? "2FA is on. You will need your authenticator app or a recovery code when signing in."
            : "Add a second step with any authenticator app. Security emails go to " + email + "."}
        </p>

        {!enabled && !setup && (
          <Button className="mt-3" size="sm" onClick={beginSetup} loading={twoFactorPending}>
            Set up 2FA
          </Button>
        )}

        {setup && !enabled && (
          <form onSubmit={enable} className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-xl border border-line bg-white p-1" />
            <div>
              <p className="text-[12.5px] text-ink-muted">Scan the QR code, or enter this secret manually:</p>
              <code className="mt-1 block break-all rounded-lg bg-surface-2 px-2 py-1.5 text-[12px] text-ink">{setup.secret}</code>
              <Label htmlFor="totpCode" className="mt-3">6-digit code</Label>
              <Input
                id="totpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                required
              />
              <Button type="submit" size="sm" className="mt-3" loading={twoFactorPending}>
                Enable 2FA
              </Button>
            </div>
          </form>
        )}

        {enabled && (
          <form onSubmit={disable} className="mt-3 grid gap-2 sm:max-w-sm">
            <div>
              <Label htmlFor="disablePassword">Password</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disableForm.password}
                onChange={(event) => setDisableForm({ ...disableForm, password: event.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="disableCode">Authenticator or recovery code</Label>
              <Input
                id="disableCode"
                value={disableForm.code}
                onChange={(event) => setDisableForm({ ...disableForm, code: event.target.value })}
                required
              />
            </div>
            <Button type="submit" variant="destructive" size="sm" loading={twoFactorPending}>
              Disable 2FA
            </Button>
          </form>
        )}
      </section>

      <Dialog
        open={Boolean(recoveryCodes)}
        onOpenChange={(open) => !open && setRecoveryCodes(null)}
        title="Save your recovery codes"
        description="Each code works once. Store them somewhere safe and offline."
      >
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes?.map((recovery) => (
              <code key={recovery} className="rounded-lg bg-surface-2 px-2 py-1.5 text-center text-[12px] text-ink">
                {recovery}
              </code>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setRecoveryCodes(null)}>I have saved them</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = React.useState<Session[] | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: Session[] }>("/api/v1/settings/sessions");
      setSessions(data.sessions);
    } catch (error) {
      toast({ title: "Could not load sessions", description: errorMessage(error), variant: "error" });
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id?: string) {
    setPending(id ?? "all");
    try {
      await apiFetch("/api/v1/settings/sessions", { method: "DELETE", json: id ? { id } : { all: true } });
      await load();
      toast({ title: id ? "Session revoked" : "Other sessions signed out", variant: "success" });
    } catch (error) {
      toast({ title: "Could not revoke session", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">Active sessions</h2>
          <p className="mt-0.5 text-[12px] text-ink-muted">Devices signed in to your account.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => revoke()} loading={pending === "all"}>
          Sign out others
        </Button>
      </div>
      <div className="mt-3 divide-y divide-line">
        {sessions === null ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">No active sessions.</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-3 text-ink-muted">
                <Monitor className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {session.userAgent?.slice(0, 70) || "Unknown device"}
                  {session.current && <span className="ml-2 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-mint">This device</span>}
                </p>
                <p className="text-[11.5px] text-ink-faint">
                  {session.ip || "Unknown IP"} · active {timeAgo(session.lastSeenAt)}
                </p>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" onClick={() => revoke(session.id)} loading={pending === session.id}>
                  Revoke
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DataSection({ username }: { username: string }) {
  const [confirmText, setConfirmText] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiFetch("/api/v1/settings/delete", { method: "POST", json: { password, confirm: confirmText } });
      window.location.href = "/";
    } catch (error) {
      toast({ title: "Could not delete account", description: errorMessage(error), variant: "error" });
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Download className="h-4 w-4 text-brand" /> Export your data
        </h2>
        <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
          Download a JSON copy of your profile, posts, comments, messages, communities and settings.
        </p>
        <a
          href="/api/v1/settings/export"
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-2"
          download
        >
          <Download className="h-3.5 w-3.5" /> Download my data
        </a>
      </section>

      <section className="surface-card border-red-500/30 p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-red-600 dark:text-red-400">
          <Trash2 className="h-4 w-4" /> Delete account
        </h2>
        <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
          This signs you out everywhere, removes your posts and comments, and deactivates @{username}. This cannot be undone.
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen} title="Delete account" description="This action cannot be undone. Type DELETE to confirm." size="sm">
        <form onSubmit={deleteAccount} className="px-5 py-4">
          <Label htmlFor="deletePassword">Password</Label>
          <Input
            id="deletePassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div className="mt-3">
            <Label htmlFor="deleteConfirm">Type DELETE</Label>
            <Input
              id="deleteConfirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="DELETE"
              required
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={pending} disabled={confirmText !== "DELETE"}>
              Delete account
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-5 text-ink-muted">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
