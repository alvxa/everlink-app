import { db } from "@/lib/db";
import { guard, json, notFound, withApi } from "@/lib/api";
import { requireAdminApi } from "@/lib/api-session";
import { adminCommunityActionSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "admin:community-action", 40, 60 * 60 * 1000);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = adminCommunityActionSchema.parse(await req.json());
    const community = await db.community.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, ownerId: true },
    });
    if (!community) throw notFound("That community does not exist.");

    await db.community.update({
      where: { id },
      data:
        input.action === "SUSPEND"
          ? {
              suspendedAt: new Date(),
              suspendedReason: input.reason || "Community guidelines violation.",
            }
          : { suspendedAt: null, suspendedReason: null },
    });
    await db.$transaction([
      db.moderationAction.create({
        data: {
          moderatorId: admin.id,
          targetType: "COMMUNITY",
          targetId: id,
          action: input.action === "SUSPEND" ? "SUSPEND_COMMUNITY" : "RESTORE_USER",
          note: input.reason,
        },
      }),
      db.auditLog.create({
        data: {
          actorId: admin.id,
          action: `admin.community.${input.action.toLowerCase()}`,
          targetType: "COMMUNITY",
          targetId: id,
          metadata: { reason: input.reason },
        },
      }),
    ]);
    await createNotification({
      userId: community.ownerId,
      type: "SYSTEM",
      actorId: admin.id,
      title:
        input.action === "SUSPEND"
          ? `Your community ${community.name} was suspended`
          : `Your community ${community.name} was restored`,
      body: input.reason,
      link: `/communities/${community.slug}`,
      entityType: "COMMUNITY",
      entityId: id,
      dedupeKey: `community-action:${id}:${input.action}:${Date.now()}`,
    });
    return json({ ok: true });
  });
}
