"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { CountUp } from "@/components/ui/count-up";
import { apiFetch, errorMessage } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import type { AuthorDTO } from "@/lib/types";
import type { ReactNode } from "react";

/* -------------------------------- Users ---------------------------------- */

export function UserActionsMenu({
  user,
  canManageRoles = false,
}: {
  user: { id: string; status: string; verified: boolean; role: string };
  canManageRoles?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function act(action: string, reason = "") {
    if (action === "SUSPEND" && !window.confirm("Suspend this account? All of their sessions will be revoked.")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/admin/users/${user.id}`, { method: "PATCH", json: { action, reason } });
      toast({ title: "Account updated", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Action failed", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dropdown
      align="right"
      trigger={
        <Button size="icon-sm" variant="ghost" aria-label="Account actions" disabled={busy}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      }
    >
      {(close) => (
        <div className="w-52">
          {user.status === "ACTIVE" ? (
            <MenuItem
              danger
              icon={<UserX className="h-4 w-4" />}
              onClick={() => {
                close();
                const reason = window.prompt("Reason for suspension (shown to the member):", "Violation of the Everlink community guidelines.");
                if (reason !== null) void act("SUSPEND", reason);
              }}
            >
              Suspend account
            </MenuItem>
          ) : (
            <MenuItem
              icon={<UserCheck className="h-4 w-4" />}
              onClick={() => {
                close();
                void act("RESTORE");
              }}
            >
              Restore account
            </MenuItem>
          )}
          {!user.verified && (
            <MenuItem
              icon={<BadgeCheck className="h-4 w-4" />}
              onClick={() => {
                close();
                void act("VERIFY");
              }}
            >
              Mark verified
            </MenuItem>
          )}
          {canManageRoles && user.role !== "MODERATOR" && (
            <MenuItem
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => {
                close();
                void act("MAKE_MODERATOR");
              }}
            >
              Make moderator
            </MenuItem>
          )}
          {canManageRoles && user.role !== "USER" && (
            <MenuItem
              icon={<UserCheck className="h-4 w-4" />}
              onClick={() => {
                close();
                void act("MAKE_USER");
              }}
            >
              Remove staff role
            </MenuItem>
          )}
          {canManageRoles && user.role !== "ADMIN" && (
            <MenuItem
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => {
                close();
                if (window.confirm("Give this account full administrator access?")) void act("MAKE_ADMIN");
              }}
            >
              Make administrator
            </MenuItem>
          )}
        </div>
      )}
    </Dropdown>
  );
}

/* -------------------------------- Posts ---------------------------------- */

export type AdminPost = {
  id: string;
  body: string;
  type: string;
  visibility: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  community: { slug: string; name: string } | null;
  counts: { comments: number; reactions: number; reposts: number };
  reports: number;
};

export function PostModerationList({ posts }: { posts: AdminPost[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(posts);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => setItems(posts), [posts]);

  async function remove(post: AdminPost) {
    if (!window.confirm("Remove this post from Everlink? This is a soft delete and is recorded in the audit log.")) return;
    setBusy(post.id);
    try {
      await apiFetch(`/api/v1/admin/posts/${post.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== post.id));
      toast({ title: "Post removed", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not remove post", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) {
    return <p className="surface-card p-6 text-center text-[13px] text-ink-faint">No posts match this view.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((post) => (
        <li key={post.id} className="surface-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start">
          <Avatar src={post.author.avatarUrl} name={post.author.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-faint">
              <Link href={`/profile/${post.author.username}`} className="font-semibold text-ink hover:text-brand">
                @{post.author.username}
              </Link>
              <span>· {timeAgo(post.createdAt)}</span>
              <Badge variant="muted">{post.type.toLowerCase()}</Badge>
              <Badge variant="outline">{post.visibility.toLowerCase()}</Badge>
              {post.community && <span>in {post.community.name}</span>}
              {post.reports > 0 && <Badge variant="danger">{post.reports} reports</Badge>}
            </div>
            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[13px] leading-5 text-ink">{post.body || "(media post)"}</p>
            <p className="mt-1 text-[11px] text-ink-faint">
              {post.counts.reactions} reactions · {post.counts.comments} comments · {post.counts.reposts} reposts
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={`/p/${post.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-ink-muted hover:bg-surface-3 hover:text-ink">
              <ExternalLink className="h-3.5 w-3.5" /> View
            </Link>
            <Button size="sm" variant="destructive" loading={busy === post.id} onClick={() => remove(post)}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------- Reports --------------------------------- */

export type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  reporter: AuthorDTO;
  reviewer: AuthorDTO | null;
  target: { label: string; link: string | null; excerpt: string };
};

const STATUS_STYLES: Record<string, "danger" | "ocean" | "mint" | "muted"> = {
  PENDING: "danger",
  REVIEWING: "ocean",
  RESOLVED: "mint",
  DISMISSED: "muted",
};

export function ReportQueue({ reports }: { reports: AdminReport[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(reports);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{ report: AdminReport; action: "RESOLVE" | "DISMISS" } | null>(null);
  const [note, setNote] = React.useState("");
  const [removeContent, setRemoveContent] = React.useState(false);
  const [suspendTarget, setSuspendTarget] = React.useState(false);

  React.useEffect(() => setItems(reports), [reports]);

  function openDialog(report: AdminReport, action: "RESOLVE" | "DISMISS") {
    setDialog({ report, action });
    setNote("");
    setRemoveContent(false);
    setSuspendTarget(false);
  }

  async function startReview(report: AdminReport) {
    setBusy(report.id);
    try {
      await apiFetch(`/api/v1/admin/reports/${report.id}`, { method: "PATCH", json: { action: "REVIEWING" } });
      setItems((prev) => prev.map((item) => (item.id === report.id ? { ...item, status: "REVIEWING" } : item)));
      toast({ title: "Marked as reviewing" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update report", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function submitDialog() {
    if (!dialog) return;
    setBusy(dialog.report.id);
    try {
      await apiFetch(`/api/v1/admin/reports/${dialog.report.id}`, {
        method: "PATCH",
        json: {
          action: dialog.action,
          note: note.trim(),
          removeContent: dialog.action === "RESOLVE" && removeContent,
          suspendTarget: dialog.action === "RESOLVE" && suspendTarget,
        },
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === dialog.report.id ? { ...item, status: dialog.action === "RESOLVE" ? "RESOLVED" : "DISMISSED" } : item
        )
      );
      toast({ title: dialog.action === "RESOLVE" ? "Report resolved" : "Report dismissed", variant: "success" });
      setDialog(null);
      router.refresh();
    } catch (error) {
      toast({ title: "Could not close report", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) {
    return <p className="surface-card p-6 text-center text-[13px] text-ink-faint">Nothing in this queue.</p>;
  }

  return (
    <>
      <ul className="space-y-2.5">
        {items.map((report) => {
          const open = report.status === "PENDING" || report.status === "REVIEWING";
          return (
            <li key={report.id} className="surface-card p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_STYLES[report.status] ?? "muted"}>{report.status.toLowerCase()}</Badge>
                <Badge variant="outline">{report.targetType.toLowerCase()}</Badge>
                <span className="text-[11.5px] text-ink-faint">{timeAgo(report.createdAt)}</span>
                <span className="ml-auto text-[11.5px] text-ink-faint">
                  reported by{" "}
                  <Link href={`/profile/${report.reporter.username}`} className="font-semibold text-ink hover:text-brand">
                    @{report.reporter.username}
                  </Link>
                </span>
              </div>

              <p className="mt-2 text-[13px] font-semibold text-ink">{report.reason}</p>
              {report.details && <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">{report.details}</p>}

              <div className="mt-2.5 rounded-xl border border-line bg-surface-2 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11.5px] font-semibold text-ink">{report.target.label}</p>
                  {report.target.link && (
                    <Link href={report.target.link} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-ink-muted">{report.target.excerpt || "No preview available."}</p>
              </div>

              {report.resolutionNote && (
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  Resolution: {report.resolutionNote}
                  {report.reviewer && ` · by @${report.reviewer.username}`}
                </p>
              )}

              {open && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.status === "PENDING" && (
                    <Button size="sm" variant="outline" loading={busy === report.id} onClick={() => startReview(report)}>
                      <RefreshCw className="h-3.5 w-3.5" /> Start review
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openDialog(report, "RESOLVE")}>
                    <Check className="h-3.5 w-3.5" /> Resolve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openDialog(report, "DISMISS")}>
                    <X className="h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(next) => {
          if (!next) setDialog(null);
        }}
        title={dialog?.action === "RESOLVE" ? "Resolve report" : "Dismiss report"}
        description={
          dialog?.action === "RESOLVE"
            ? "Record what action was taken. The reporter and the target are notified."
            : "Explain why no action is needed. The reporter is notified."
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog?.action === "RESOLVE" ? "default" : "secondary"}
              loading={Boolean(dialog && busy === dialog.report.id)}
              onClick={submitDialog}
            >
              {dialog?.action === "RESOLVE" ? "Resolve report" : "Dismiss report"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 px-5 py-4">
          <div>
            <Label htmlFor="report-note">Moderator note</Label>
            <Textarea
              id="report-note"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Keep this clear and specific."
            />
          </div>
          {dialog?.action === "RESOLVE" && (
            <div className="space-y-2">
              {(dialog.report.targetType === "POST" || dialog.report.targetType === "COMMENT") && (
                <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink">
                  <input type="checkbox" checked={removeContent} onChange={(event) => setRemoveContent(event.target.checked)} />
                  Remove the reported content
                </label>
              )}
              {dialog.report.targetType === "USER" && (
                <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink">
                  <input type="checkbox" checked={suspendTarget} onChange={(event) => setSuspendTarget(event.target.checked)} />
                  Suspend the reported account
                </label>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}

/* ------------------------------ Communities ------------------------------- */

export type AdminCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  countryCode: string | null;
  imageUrl: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  owner: { username: string; displayName: string };
  members: number;
  posts: number;
};

export function CommunityModerationList({ communities, canModerate }: { communities: AdminCommunity[]; canModerate: boolean }) {
  const router = useRouter();
  const [items, setItems] = React.useState(communities);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => setItems(communities), [communities]);

  async function act(community: AdminCommunity, action: "SUSPEND" | "RESTORE") {
    if (!canModerate) {
      toast({ title: "Only administrators can suspend communities", variant: "warning" });
      return;
    }
    const reason =
      action === "SUSPEND"
        ? window.prompt("Reason for suspension (shown to the owner):", community.suspendedReason ?? "Community guidelines violation.")
        : null;
    if (action === "SUSPEND" && reason === null) return;
    setBusy(community.id);
    try {
      await apiFetch(`/api/v1/admin/communities/${community.id}`, { method: "PATCH", json: { action, reason: reason ?? "" } });
      setItems((prev) =>
        prev.map((item) =>
          item.id === community.id
            ? {
                ...item,
                suspendedAt: action === "SUSPEND" ? new Date().toISOString() : null,
                suspendedReason: action === "SUSPEND" ? reason : null,
              }
            : item
        )
      );
      toast({ title: action === "SUSPEND" ? "Community suspended" : "Community restored", variant: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "Could not update community", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) {
    return <p className="surface-card p-6 text-center text-[13px] text-ink-faint">No communities match this view.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((community) => (
        <li key={community.id} className="surface-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-3 text-ink-faint">
            {community.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={community.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              community.name.slice(0, 1)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/communities/${community.slug}`} className="text-[13.5px] font-semibold text-ink hover:text-brand">
                {community.name}
              </Link>
              <Badge variant={community.suspendedAt ? "danger" : "mint"}>{community.suspendedAt ? "suspended" : "active"}</Badge>
              <Badge variant="outline">{community.type.toLowerCase()}</Badge>
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
              by @{community.owner.username} · {community.members} members · {community.posts} posts · created {timeAgo(community.createdAt)}
            </p>
            {community.suspendedReason && (
              <p className="mt-1 text-[11.5px] text-red-600 dark:text-red-400">Reason: {community.suspendedReason}</p>
            )}
          </div>
          <Button
            size="sm"
            variant={community.suspendedAt ? "secondary" : "destructive"}
            loading={busy === community.id}
            disabled={!canModerate}
            onClick={() => act(community, community.suspendedAt ? "RESTORE" : "SUSPEND")}
          >
            {community.suspendedAt ? "Restore" : "Suspend"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------- Settings -------------------------------- */

type SiteSettings = {
  registrationOpen: string;
};

type EnvFlags = {
  smtpConfigured: boolean;
  translationConfigured: boolean;
  redisConfigured: boolean;
  pushConfigured: boolean;
  turnConfigured: boolean;
};

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-line py-2.5 last:border-0">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
      <div>
        <p className="text-[12.5px] font-semibold text-ink">{label}</p>
        <p className="text-[11.5px] leading-5 text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}

export function AdminSettingsForm({ settings, env }: { settings: SiteSettings; env: EnvFlags }) {
  const [form, setForm] = React.useState(settings);
  const [pending, setPending] = React.useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiFetch("/api/v1/admin/settings", { method: "PATCH", json: form });
      toast({ title: "Settings saved", variant: "success" });
    } catch (error) {
      toast({ title: "Could not save settings", description: errorMessage(error), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={save} className="surface-card space-y-4 p-4">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">Registration</h2>
          <p className="text-[11.5px] leading-5 text-ink-muted">
            Controls the public sign-up endpoint. Existing members are never affected.
          </p>
        </div>
        <ToggleRow
          label="Registration open"
          description="Allow new accounts to sign up."
          checked={form.registrationOpen === "true"}
          onChange={(value) => setForm({ registrationOpen: value ? "true" : "false" })}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            Save settings
          </Button>
        </div>
      </form>

      <section className="surface-card p-4">
        <h2 className="text-[14px] font-semibold text-ink">Integrations</h2>
        <p className="mt-0.5 text-[11.5px] text-ink-muted">Detected from environment variables. Nothing here is simulated.</p>
        <div className="mt-2">
          <StatusRow
            label="Email delivery (SMTP)"
            ok={env.smtpConfigured}
            detail={
              env.smtpConfigured
                ? "SMTP is configured. Verification and reset emails are delivered."
                : "SMTP is not configured. Emails are written to the development outbox only."
            }
          />
          <StatusRow
            label="Browser push (VAPID)"
            ok={env.pushConfigured}
            detail={
              env.pushConfigured
                ? "VAPID keys are configured. Users can enable browser push notifications in settings."
                : "Not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable browser push."
            }
          />
          <StatusRow
            label="Live relay (TURN)"
            ok={env.turnConfigured}
            detail={
              env.turnConfigured
                ? "TURN is configured. Live rooms can relay media through strict NATs."
                : "STUN only. Live rooms work on most networks but strict corporate or mobile NATs may fail to connect."
            }
          />
          <StatusRow
            label="File storage"
            ok={true}
            detail="Local disk storage is active and serves uploads from this server."
          />
          <StatusRow
            label="Translation provider"
            ok={env.translationConfigured}
            detail={
              env.translationConfigured
                ? "Translation provider configured for Language Bridge."
                : "Translation is not configured. The translate endpoint returns 503 instead of fake output."
            }
          />
          <StatusRow
            label="Redis rate limiting"
            ok={env.redisConfigured}
            detail={env.redisConfigured ? "Redis-backed rate limits are active." : "Using in-process rate limiting (single instance)."}
          />
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3 py-2.5", checked && "border-brand/40")}>
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
        <span className="block text-[11.5px] leading-5 text-ink-muted">{description}</span>
      </span>
    </label>
  );
}

/* -------------------------------- Helpers -------------------------------- */

export function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" | "good" }) {
  return (
    <div className="stat-tile transition-transform duration-300 hover:-translate-y-0.5">
      <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-electric shadow-[0_0_10px_rgba(167,139,250,.95)]" />
      <p className="relative text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p
        className={cn(
          "relative mt-1.5 font-display text-2xl font-bold tracking-tight",
          tone === "warn" ? "text-amber-400" : tone === "good" ? "text-mint" : "text-ink"
        )}
      >
        <CountUp value={value} />
      </p>
    </div>
  );
}

export function BarSeries({ series, color = "bg-electric" }: { series: { day: string; count: number }[]; color?: string }) {
  const max = Math.max(1, ...series.map((point) => point.count));
  if (!series.length) return <p className="text-[12px] text-ink-faint">No activity yet.</p>;
  const label = (day: string) => new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="bar-grow">
      <div className="flex h-28 items-end gap-1.5">
        {series.map((point, index) => (
          <div
            key={point.day}
            className="group relative flex h-full flex-1 items-end overflow-hidden rounded-md bg-surface-3 dark:bg-white/[0.03]"
            title={`${label(point.day)}: ${point.count}`}
          >
            <div
              className={cn("bar-fill w-full rounded-md opacity-90 transition-opacity group-hover:opacity-100", color)}
              style={{ height: `${Math.max(6, (point.count / max) * 100)}%`, animationDelay: `${index * 55}ms` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] font-medium text-ink-faint">
        <span>{label(series[0]!.day)}</span>
        <span>{label(series[series.length - 1]!.day)}</span>
      </div>
    </div>
  );
}

export function InlineStat({ icon, label, value }: { icon?: ReactNode; label: ReactNode; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
