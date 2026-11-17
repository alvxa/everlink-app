import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PostModerationList } from "@/components/admin/admin-controls";

export const metadata: Metadata = { title: "Admin · Posts" };
export const dynamic = "force-dynamic";

type Search = { q?: string; cursor?: string };

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/admin/posts?${query}` : "/admin/posts";
}

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff();
  const { q = "", cursor = "" } = await searchParams;

  const rows = await db.post.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { body: { contains: q, mode: "insensitive" } },
              { author: { username: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      community: { select: { slug: true, name: true } },
      _count: { select: { comments: true, reactions: true, reposts: true } },
    },
  });

  const hasMore = rows.length > 30;
  const page = hasMore ? rows.slice(0, 30) : rows;
  const reportCounts = await db.report.groupBy({
    by: ["targetId"],
    where: { targetType: "POST", targetId: { in: page.map((post) => post.id) } },
    _count: { _all: true },
  });
  const reportMap = new Map(reportCounts.map((row) => [row.targetId, row._count._all]));
  const posts = page.map((post) => ({
    id: post.id,
    body: post.body,
    type: post.type,
    visibility: post.visibility,
    createdAt: post.createdAt.toISOString(),
    author: {
      username: post.author.username,
      displayName: post.author.profile?.displayName || post.author.username,
      avatarUrl: post.author.profile?.avatarUrl ?? null,
    },
    community: post.community,
    counts: post._count,
    reports: reportMap.get(post.id) ?? 0,
  }));
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return (
    <div className="space-y-4">
      <form action="/admin/posts" method="get" className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input name="q" defaultValue={q} placeholder="Search post text or author username" className="h-10 pl-9 text-[13.5px]" />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
        {q && (
          <Link href="/admin/posts" className="text-center text-[12px] font-semibold text-ink-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>

      <p className="px-1 text-[11.5px] text-ink-faint">
        Showing live posts only. Removing a post soft-deletes it and writes an audit log entry.
      </p>

      <PostModerationList posts={posts} />

      <div className="flex items-center justify-between gap-2">
        {q && (
          <Link href="/admin/posts" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-muted hover:text-ink">
            <ChevronLeft className="h-3.5 w-3.5" /> First page
          </Link>
        )}
        {nextCursor && (
          <Link
            href={buildQuery({ q, cursor: nextCursor })}
            className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
          >
            Older posts
          </Link>
        )}
      </div>
    </div>
  );
}
