import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Moderation" };
export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, "danger" | "ocean" | "mint" | "muted" | "default"> = {
  SUSPEND_USER: "danger",
  RESTORE_USER: "mint",
  WARN: "ocean",
  REMOVE_POST: "danger",
  REMOVE_COMMENT: "danger",
  SUSPEND_COMMUNITY: "danger",
  RESTORE_COMMUNITY: "mint",
};

export default async function AdminModerationPage() {
  await requireStaff();
  const [actions, audit] = await Promise.all([
    db.moderationAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        moderator: { select: { username: true, profile: { select: { displayName: true } } } },
        targetUser: { select: { username: true } },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { actor: { select: { username: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Moderation actions</h2>
            <p className="text-[11.5px] text-ink-muted">Every staff decision on users, posts and communities.</p>
          </div>
          <Badge variant="muted">{actions.length} recent</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2 font-semibold">Action</th>
                <th className="px-4 py-2 font-semibold">Moderator</th>
                <th className="px-4 py-2 font-semibold">Target</th>
                <th className="px-4 py-2 font-semibold">Note</th>
                <th className="px-4 py-2 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {actions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-faint">
                    No moderation actions have been recorded yet.
                  </td>
                </tr>
              )}
              {actions.map((action) => (
                <tr key={action.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    <Badge variant={ACTION_TONE[action.action] ?? "muted"}>{action.action.toLowerCase().replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink">
                    @{action.moderator.username}
                    <span className="block text-[11px] text-ink-faint">
                      {action.moderator.profile?.displayName || action.moderator.username}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {action.targetUser ? `@${action.targetUser.username}` : `${action.targetType.toLowerCase()} ${action.targetId.slice(0, 8)}`}
                  </td>
                  <td className="max-w-[280px] px-4 py-2.5 text-ink-muted">
                    <span className="line-clamp-2">{action.note || "No note recorded."}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-faint">{timeAgo(action.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Audit log</h2>
            <p className="text-[11.5px] text-ink-muted">Account, role and settings changes. Retained for accountability.</p>
          </div>
          <Badge variant="muted">{audit.length} recent</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2 font-semibold">Action</th>
                <th className="px-4 py-2 font-semibold">Actor</th>
                <th className="px-4 py-2 font-semibold">Target</th>
                <th className="px-4 py-2 font-semibold">Metadata</th>
                <th className="px-4 py-2 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-faint">
                    The audit log is empty.
                  </td>
                </tr>
              )}
              {audit.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink">{entry.action}</td>
                  <td className="px-4 py-2.5 text-ink-muted">@{entry.actor?.username ?? "system"}</td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {(entry.targetType ?? "unknown").toLowerCase()}
                    {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ""}
                  </td>
                  <td className="max-w-[320px] px-4 py-2.5 text-ink-faint">
                    <span className="line-clamp-2 font-mono text-[11px]">
                      {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 160) : "No metadata"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-faint">{timeAgo(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
