import { db } from "@/lib/db";
import { badRequest, conflict, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { createNotification } from "@/lib/notifications";
import { reportSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "report:create", 12, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await req.json().then((body) => reportSchema.parse(body));

    let targetAuthorId: string | null = null;
    if (input.targetType === "POST") {
      const post = await db.post.findFirst({
        where: { id: input.targetId, deletedAt: null },
        select: { authorId: true },
      });
      if (!post) throw notFound("That post no longer exists.");
      targetAuthorId = post.authorId;
    } else if (input.targetType === "COMMENT") {
      const comment = await db.comment.findFirst({
        where: { id: input.targetId, deletedAt: null },
        select: { authorId: true },
      });
      if (!comment) throw notFound("That comment no longer exists.");
      targetAuthorId = comment.authorId;
    } else if (input.targetType === "USER") {
      const user = await db.user.findFirst({ where: { id: input.targetId, deletedAt: null }, select: { id: true } });
      if (!user) throw notFound("That account does not exist.");
      targetAuthorId = user.id;
    } else if (input.targetType === "COMMUNITY") {
      const community = await db.community.findFirst({ where: { id: input.targetId }, select: { ownerId: true } });
      if (!community) throw notFound("That community no longer exists.");
      targetAuthorId = community.ownerId;
    } else if (input.targetType === "MESSAGE") {
      const message = await db.message.findFirst({
        where: {
          id: input.targetId,
          deletedAt: null,
          conversation: { members: { some: { userId: me.id } } },
        },
        select: { senderId: true },
      });
      if (!message) throw notFound("That message is not available.");
      targetAuthorId = message.senderId;
    } else if (input.targetType === "STORY") {
      const story = await db.story.findFirst({
        where: { id: input.targetId, deletedAt: null, expiresAt: { gt: new Date() } },
        select: { authorId: true },
      });
      if (!story) throw notFound("That moment has expired.");
      targetAuthorId = story.authorId;
    } else if (input.targetType === "LIVE_ROOM") {
      const room = await db.liveRoom.findUnique({ where: { id: input.targetId }, select: { hostId: true } });
      if (!room) throw notFound("That room does not exist.");
      targetAuthorId = room.hostId;
    } else if (input.targetType === "EVENT") {
      const event = await db.event.findUnique({ where: { id: input.targetId }, select: { creatorId: true } });
      if (!event) throw notFound("That event does not exist.");
      targetAuthorId = event.creatorId;
    }

    const openDuplicate = await db.report.findFirst({
      where: {
        reporterId: me.id,
        targetType: input.targetType as "POST",
        targetId: input.targetId,
        status: { in: ["PENDING", "REVIEWING"] },
      },
    });
    if (openDuplicate) throw conflict("You already reported this. Our team is reviewing it.");

    const report = await db.report.create({
      data: {
        reporterId: me.id,
        targetType: input.targetType as "POST",
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
      },
    });

    const staff = await db.user.findMany({
      where: { role: { in: ["ADMIN", "MODERATOR"] }, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    for (const member of staff) {
      await createNotification({
        userId: member.id,
        type: "REPORT_UPDATE",
        actorId: me.id,
        title: "New report awaiting review",
        body: `${input.reason} · ${input.targetType}`,
        link: `/admin/reports?focus=${report.id}`,
        entityType: "REPORT",
        entityId: report.id,
        dedupeKey: `report-open:${report.id}:${member.id}`,
      });
    }

    if (targetAuthorId && targetAuthorId !== me.id) {
      await db.auditLog.create({
        data: {
          actorId: me.id,
          action: "report.create",
          targetType: input.targetType,
          targetId: input.targetId,
          metadata: { reportId: report.id, reason: input.reason },
        },
      });
    }

    return json({ report: { id: report.id, status: report.status } }, { status: 201 });
  });
}

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const reports = await db.report.findMany({
      where: { reporterId: me.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    return json({
      reports: reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        reason: r.reason,
        status: r.status,
        resolutionNote: r.resolutionNote,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });
}
