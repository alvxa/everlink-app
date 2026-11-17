import { db } from "@/lib/db";
import { badRequest, guard, json, notFound, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { adminReportActionSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "admin:report-action", 60, 60 * 60 * 1000);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = adminReportActionSchema.parse(await req.json());

    const report = await db.report.findUnique({ where: { id } });
    if (!report) throw notFound("That report does not exist.");
    if (report.status === "RESOLVED" || report.status === "DISMISSED") {
      throw badRequest("This report has already been closed.");
    }

    if (input.action === "REVIEWING") {
      await db.report.update({ where: { id }, data: { status: "REVIEWING", reviewedById: staff.id } });
      return json({ ok: true, status: "REVIEWING" });
    }

    if (input.action === "DISMISS") {
      await db.report.update({
        where: { id },
        data: {
          status: "DISMISSED",
          reviewedById: staff.id,
          resolutionNote: input.note || "No action taken after review.",
        },
      });
      await db.$transaction([
        db.moderationAction.create({
          data: {
            moderatorId: staff.id,
            targetType: report.targetType,
            targetId: report.targetId,
            action: "DISMISS_REPORT",
            note: input.note,
          },
        }),
        db.auditLog.create({
          data: {
            actorId: staff.id,
            action: "admin.report.dismiss",
            targetType: report.targetType,
            targetId: report.targetId,
            metadata: { reportId: id },
          },
        }),
      ]);
      await createNotification({
        userId: report.reporterId,
        type: "REPORT_UPDATE",
        actorId: staff.id,
        title: "Your report was reviewed",
        body: "No action was needed for the content you reported.",
        link: "/settings?tab=reports",
        entityType: "REPORT",
        entityId: id,
        dedupeKey: `report-update:${id}`,
      });
      return json({ ok: true, status: "DISMISSED" });
    }

    let targetAuthorId: string | null = null;
    if (report.targetType === "POST") {
      const post = await db.post.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
      targetAuthorId = post?.authorId ?? null;
      if (input.removeContent) {
        await db.post.updateMany({ where: { id: report.targetId }, data: { deletedAt: new Date() } });
      }
    } else if (report.targetType === "COMMENT") {
      const comment = await db.comment.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
      targetAuthorId = comment?.authorId ?? null;
      if (input.removeContent) {
        await db.comment.updateMany({ where: { id: report.targetId }, data: { deletedAt: new Date() } });
      }
    } else if (report.targetType === "USER") {
      targetAuthorId = report.targetId;
      if (input.suspendTarget) {
        await db.user.update({
          where: { id: report.targetId },
          data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: input.note || "Community guidelines violation." },
        });
        await db.session.deleteMany({ where: { userId: report.targetId } });
      }
    }

    await db.$transaction([
      db.report.update({
        where: { id },
        data: {
          status: "RESOLVED",
          reviewedById: staff.id,
          resolutionNote: input.note || "Action taken by the moderation team.",
        },
      }),
      db.moderationAction.create({
        data: {
          moderatorId: staff.id,
          targetUserId: targetAuthorId,
          targetType: report.targetType,
          targetId: report.targetId,
          action: input.suspendTarget ? "SUSPEND_USER" : input.removeContent ? "REMOVE_CONTENT" : "WARN",
          note: input.note,
        },
      }),
      db.auditLog.create({
        data: {
          actorId: staff.id,
          action: "admin.report.resolve",
          targetType: report.targetType,
          targetId: report.targetId,
          metadata: { reportId: id, removeContent: input.removeContent, suspendTarget: input.suspendTarget },
        },
      }),
    ]);

    await createNotification({
      userId: report.reporterId,
      type: "REPORT_UPDATE",
      actorId: staff.id,
      title: "Your report was resolved",
      body: input.note || "Thank you for helping keep Everlink safe. Action was taken.",
      link: "/settings?tab=reports",
      entityType: "REPORT",
      entityId: id,
      dedupeKey: `report-update:${id}`,
    });
    if (targetAuthorId) {
      await createNotification({
        userId: targetAuthorId,
        type: "SECURITY",
        actorId: staff.id,
        title: input.suspendTarget ? "Your account has been suspended" : input.removeContent ? "Content was removed" : "Community guidelines warning",
        body: input.note || "Please review the Everlink community guidelines.",
        link: "/community-guidelines",
        entityType: "REPORT",
        entityId: id,
        dedupeKey: `report-target:${id}:${targetAuthorId}`,
      });
    }

    return json({ ok: true, status: "RESOLVED" });
  });
}
