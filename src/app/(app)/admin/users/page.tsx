import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, Search, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserActionsMenu } from "@/components/admin/admin-controls";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Users" };
export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; role?: string; cursor?: string };

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

const ROLES = [
  { value: "", label: "Any role" },
  { value: "USER", label: "Member" },
  { value: "MODERATOR", label: "Moderator" },
  { value: "ADMIN", label: "Administrator" },
];

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const staff = await requireStaff();
  const { q = "", status = "", role = "", cursor = "" } = await searchParams;

  const rows = await db.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { profile: { displayName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(status ? { status: status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED" } : {}),
      ...(role ? { role: role as "USER" | "MODERATOR" | "ADMIN" } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      verified: true,
      createdAt: true,
      lastActiveAt: true,
      suspendedReason: true,
      profile: { select: { displayName: true, avatarUrl: true, countryCode: true } },
      _count: { select: { posts: true, followers: true } },
    },
  });

  const hasMore = rows.length > 30;
  const users = hasMore ? rows.slice(0, 30) : rows;
  const nextCursor = hasMore ? users[users.length - 1]?.id ?? null : null;
  const filtered = Boolean(q || status || role);

  return (
    <div className="space-y-4">
      <form action="/admin/users" method="get" className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input name="q" defaultValue={q} placeholder="Search name, username or email" className="h-10 pl-9 text-[13.5px]" />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-xl border border-line bg-surface px-3 text-[13px] font-medium text-ink"
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="role"
          defaultValue={role}
          className="h-10 rounded-xl border border-line bg-surface px-3 text-[13px] font-medium text-ink"
        >
          {ROLES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Apply
        </Button>
        {filtered && (
          <Link href="/admin/users" className="text-center text-[12px] font-semibold text-ink-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>

      <ul className="space-y-2">
        {users.length === 0 && (
          <li className="surface-card p-8 text-center text-[13px] text-ink-faint">No accounts match these filters.</li>
        )}
        {users.map((member) => (
          <li key={member.id} className="surface-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
            <Avatar
              src={member.profile?.avatarUrl ?? null}
              name={member.profile?.displayName || member.username}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/profile/${member.username}`} className="text-[13.5px] font-semibold text-ink hover:text-brand">
                  {member.profile?.displayName || member.username}
                </Link>
                {member.verified && <BadgeCheck className="h-3.5 w-3.5 text-ocean" aria-label="Verified" />}
                <span className="text-[11.5px] text-ink-faint">@{member.username}</span>
                {member.role !== "USER" && (
                  <Badge variant={member.role === "ADMIN" ? "default" : "ocean"}>
                    <ShieldCheck className="h-3 w-3" /> {member.role.toLowerCase()}
                  </Badge>
                )}
                <Badge variant={member.status === "ACTIVE" ? "mint" : member.status === "SUSPENDED" ? "danger" : "muted"}>
                  {member.status.toLowerCase()}
                </Badge>
              </div>
              <p className="truncate text-[11.5px] text-ink-faint">{member.email}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {member._count.posts} posts · {member._count.followers} followers · joined {timeAgo(member.createdAt)}
                {member.lastActiveAt ? ` · seen ${timeAgo(member.lastActiveAt)} ago` : " · never signed in"}
              </p>
              {member.suspendedReason && (
                <p className="mt-1 text-[11.5px] text-red-600 dark:text-red-400">Suspended: {member.suspendedReason}</p>
              )}
            </div>
            {member.id === staff.id ? (
              <Badge variant="outline">you</Badge>
            ) : (
              <UserActionsMenu user={member} canManageRoles={staff.role === "ADMIN"} />
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2">
        {(cursor || filtered) && (
          <Link
            href={buildQuery({ q, status, role })}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-muted hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> First page
          </Link>
        )}
        {nextCursor && (
          <Link
            href={buildQuery({ q, status, role, cursor: nextCursor })}
            className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
          >
            Next page
          </Link>
        )}
      </div>
    </div>
  );
}
