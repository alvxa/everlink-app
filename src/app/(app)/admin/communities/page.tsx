import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommunityModerationList } from "@/components/admin/admin-controls";

export const metadata: Metadata = { title: "Admin · Communities" };
export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function AdminCommunitiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const staff = await requireStaff();
  const { q = "" } = await searchParams;

  const communities = await db.community.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : {},
    orderBy: [{ suspendedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      owner: { select: { username: true, profile: { select: { displayName: true } } } },
      _count: { select: { members: true, posts: { where: { deletedAt: null } } } },
    },
  });

  const rows = communities.map((community) => ({
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    type: community.type,
    countryCode: community.countryCode,
    imageUrl: community.imageUrl,
    suspendedAt: community.suspendedAt?.toISOString() ?? null,
    suspendedReason: community.suspendedReason,
    createdAt: community.createdAt.toISOString(),
    owner: {
      username: community.owner.username,
      displayName: community.owner.profile?.displayName || community.owner.username,
    },
    members: community._count.members,
    posts: community._count.posts,
  }));

  return (
    <div className="space-y-4">
      <form action="/admin/communities" method="get" className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input name="q" defaultValue={q} placeholder="Search communities by name or slug" className="h-10 pl-9 text-[13.5px]" />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
        {q && (
          <Link href="/admin/communities" className="text-center text-[12px] font-semibold text-ink-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>

      {staff.role !== "ADMIN" && (
        <p className="surface-card border-amber-500/30 px-3.5 py-2.5 text-[12px] text-amber-600 dark:text-amber-400">
          Moderators can review this list, but only administrators can suspend or restore communities.
        </p>
      )}

      <CommunityModerationList communities={rows} canModerate={staff.role === "ADMIN"} />
    </div>
  );
}
