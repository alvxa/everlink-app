import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";

export async function GET(req: Request) {
  return withApi(async () => {
    await requireStaffApi();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const communities = await db.community.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
        : {},
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        owner: { select: { username: true, profile: { select: { displayName: true } } } },
        _count: { select: { members: true, posts: { where: { deletedAt: null } } } },
      },
    });
    return json({
      communities: communities.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        type: c.type,
        countryCode: c.countryCode,
        imageUrl: c.imageUrl,
        suspendedAt: c.suspendedAt?.toISOString() ?? null,
        suspendedReason: c.suspendedReason,
        createdAt: c.createdAt.toISOString(),
        owner: { username: c.owner.username, displayName: c.owner.profile?.displayName || c.owner.username },
        members: c._count.members,
        posts: c._count.posts,
      })),
    });
  });
}
