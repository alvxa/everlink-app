import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { getAdminOverview, getReportQueue } from "@/lib/queries";

export async function GET() {
  return withApi(async () => {
    await requireStaffApi();
    const [stats, reports, recentUsers, audit] = await Promise.all([
      getAdminOverview(),
      getReportQueue("PENDING"),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
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
    return json({
      stats,
      reports: reports.slice(0, 5),
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        displayName: u.profile?.displayName || u.username,
      })),
      audit: audit.map((a) => ({
        id: a.id,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        createdAt: a.createdAt.toISOString(),
        actor: a.actor?.username ?? "system",
      })),
    });
  });
}
