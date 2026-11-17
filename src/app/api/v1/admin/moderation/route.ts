import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";

export async function GET() {
  return withApi(async () => {
    await requireStaffApi();
    const [actions, audits] = await Promise.all([
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
    return json({
      actions: actions.map((a) => ({
        id: a.id,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
        moderator: a.moderator.profile?.displayName || a.moderator.username,
        targetUser: a.targetUser?.username ?? null,
      })),
      audit: audits.map((a) => ({
        id: a.id,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        metadata: a.metadata,
        ip: a.ip,
        createdAt: a.createdAt.toISOString(),
        actor: a.actor?.username ?? "system",
      })),
    });
  });
}
