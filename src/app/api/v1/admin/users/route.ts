import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";

export async function GET(req: Request) {
  return withApi(async () => {
    await requireStaffApi();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const status = url.searchParams.get("status");
    const role = url.searchParams.get("role");
    const cursor = url.searchParams.get("cursor");

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
    const page = hasMore ? rows.slice(0, 30) : rows;
    return json({
      users: page.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        verified: u.verified,
        displayName: u.profile?.displayName || u.username,
        avatarUrl: u.profile?.avatarUrl ?? null,
        countryCode: u.profile?.countryCode ?? null,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
        suspendedReason: u.suspendedReason,
        posts: u._count.posts,
        followers: u._count.followers,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    });
  });
}
