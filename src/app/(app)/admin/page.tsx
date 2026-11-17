import Link from "next/link";
import {
  Activity,
  CircleAlert,
  FileText,
  Radio,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getAdminOverview, getReportQueue } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BarSeries, ReportQueue, StatCard, UserActionsMenu } from "@/components/admin/admin-controls";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const staff = await requireStaff();
  const [stats, pendingReports, recentUsers, audit] = await Promise.all([
    getAdminOverview(),
    getReportQueue("PENDING"),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        verified: true,
        createdAt: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { username: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Members" value={stats.users} />
        <StatCard label="Active (7d)" value={stats.activeUsers} tone="good" />
        <StatCard label="New (24h)" value={stats.newUsers} />
        <StatCard label="Posts" value={stats.posts} />
        <StatCard label="Communities" value={stats.communities} />
        <StatCard label="Open reports" value={stats.pendingReports} tone={stats.pendingReports > 0 ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="surface-card overflow-hidden" data-reveal>
            <div className="panel-header">
              <span className="icon-tile">
                <UserPlus className="h-4 w-4" />
              </span>
              <h2 className="panel-title">New members, last 7 days</h2>
              <span className="ml-auto text-[12px] font-semibold text-ink-muted">{stats.signupSeries.reduce((sum, point) => sum + point.count, 0)} total</span>
            </div>
            <div className="p-4">
              <BarSeries series={stats.signupSeries} />
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <CircleAlert className="h-4 w-4 text-amber-500" /> Pending reports
              </h2>
              <Link href="/admin/reports" className="text-[12px] font-semibold text-brand hover:underline">
                Full queue
              </Link>
            </div>
            <ReportQueue reports={pendingReports.slice(0, 5)} />
          </section>

          <section className="surface-card overflow-hidden" data-reveal>
            <div className="panel-header">
              <span className="icon-tile">
                <Activity className="h-4 w-4" />
              </span>
              <h2 className="panel-title">Recent members</h2>
            </div>
            <ul className="stagger-list divide-y divide-white/[0.06] px-4 pb-2">
              {recentUsers.map((member) => (
                <li key={member.id} className="flex items-center gap-2.5 py-2.5">
                  <Avatar src={member.profile?.avatarUrl ?? null} name={member.profile?.displayName || member.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/profile/${member.username}`} className="truncate text-[12.5px] font-semibold text-ink hover:text-brand">
                        {member.profile?.displayName || member.username}
                      </Link>
                      <span className="text-[11.5px] text-ink-faint">@{member.username}</span>
                      {member.role !== "USER" && <Badge variant="ocean">{member.role.toLowerCase()}</Badge>}
                      {member.status === "SUSPENDED" && <Badge variant="danger">suspended</Badge>}
                    </div>
                    <p className="text-[11px] text-ink-faint">joined {timeAgo(member.createdAt)}</p>
                  </div>
                  {member.id !== staff.id && <UserActionsMenu user={member} canManageRoles={staff.role === "ADMIN"} />}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-card p-4" data-reveal>
            <h2 className="text-[14px] font-semibold text-ink">Platform today</h2>
            <dl className="mt-2 space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <FileText className="h-3.5 w-3.5" /> Comments
                </dt>
                <dd className="font-semibold text-ink">{stats.comments.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Sparkles className="h-3.5 w-3.5" /> Active moments
                </dt>
                <dd className="font-semibold text-ink">{stats.stories.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Radio className="h-3.5 w-3.5" /> Live rooms
                </dt>
                <dd className="font-semibold text-ink">{stats.liveRooms.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Users className="h-3.5 w-3.5" /> Suspended accounts
                </dt>
                <dd className="font-semibold text-ink">{stats.suspended.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <CircleAlert className="h-3.5 w-3.5" /> Reports (24h)
                </dt>
                <dd className="font-semibold text-ink">{stats.reportsToday.toLocaleString()}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-card p-4" data-reveal>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-ink">Audit trail</h2>
              <Link href="/admin/moderation" className="text-[12px] font-semibold text-brand hover:underline">
                View log
              </Link>
            </div>
            <ul className="mt-2 space-y-2">
              {audit.length === 0 && <li className="text-[12px] text-ink-faint">No staff actions recorded yet.</li>}
              {audit.map((entry) => (
                <li key={entry.id} className="border-b border-line pb-2 text-[11.5px] last:border-0">
                  <p className="font-semibold text-ink">{entry.action}</p>
                  <p className="text-ink-faint">
                    @{entry.actor?.username ?? "system"} · {(entry.targetType ?? "unknown").toLowerCase()} · {timeAgo(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/users" className="surface-card px-3 py-2.5 text-[12.5px] font-semibold text-ink transition hover:text-brand">
              Manage users
            </Link>
            <Link href="/admin/posts" className="surface-card px-3 py-2.5 text-[12.5px] font-semibold text-ink transition hover:text-brand">
              Moderate posts
            </Link>
            <Link href="/admin/analytics" className="surface-card px-3 py-2.5 text-[12.5px] font-semibold text-ink transition hover:text-brand">
              Analytics
            </Link>
            <Link href="/admin/settings" className="surface-card px-3 py-2.5 text-[12.5px] font-semibold text-ink transition hover:text-brand">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
