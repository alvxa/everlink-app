import { db } from "@/lib/db";
import { forbidden, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getLiveRoom } from "@/lib/queries";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const room = await getLiveRoom(id);
    if (!room) throw notFound("That room does not exist.");
    if (room.type === "PRIVATE" && room.host.id !== me.id) {
      const invite = await db.notification.findFirst({
        where: { userId: me.id, type: "LIVE_INVITE", entityType: "LIVE_ROOM", entityId: id },
      });
      if (!invite) throw forbidden("This private room requires an invitation.");
    }
    return json({ room });
  });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("mute"), userId: z.string(), muted: z.boolean() }),
  z.object({ action: z.literal("promote"), userId: z.string(), role: z.enum(["SPEAKER", "AUDIENCE"]) }),
  z.object({ action: z.literal("remove"), userId: z.string() }),
  z.object({ action: z.literal("invite"), username: z.string().min(1).max(24) }),
]);

export async function PATCH(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "live:manage", 60, 60 * 60 * 1000);
    const { id } = await params;
    const me = await requireApiUser();
    const room = await db.liveRoom.findUnique({
      where: { id },
      select: { id: true, hostId: true, title: true, status: true },
    });
    if (!room) throw notFound("That room does not exist.");
    const input = schema.parse(await req.json());

    if (input.action === "invite") {
      const invitee = await db.user.findFirst({
        where: { username: input.username.toLowerCase(), status: "ACTIVE", deletedAt: null },
        select: { id: true, settings: { select: { notifyLive: true } } },
      });
      if (!invitee) throw notFound("That person does not exist.");
      if (invitee.settings?.notifyLive === false) throw forbidden("This person has live invitations turned off.");
      await createNotification({
        userId: invitee.id,
        type: "LIVE_INVITE",
        actorId: me.id,
        title: `${me.profile?.displayName || me.username} invited you to a live room`,
        body: room.title,
        link: `/live/${id}`,
        entityType: "LIVE_ROOM",
        entityId: id,
        dedupeKey: `live-invite:${id}:${invitee.id}`,
      });
      return json({ ok: true });
    }

    if (room.hostId !== me.id && me.role !== "ADMIN" && me.role !== "MODERATOR") {
      throw forbidden("Only the host can manage this room.");
    }

    if (input.action === "end") {
      await db.liveRoom.update({ where: { id }, data: { status: "ENDED", endedAt: new Date() } });
      await db.liveRoomParticipant.updateMany({ where: { roomId: id, leftAt: null }, data: { leftAt: new Date() } });
      return json({ ok: true, ended: true });
    }
    if (input.action === "mute") {
      await db.liveRoomParticipant.updateMany({ where: { roomId: id, userId: input.userId }, data: { muted: input.muted } });
      return json({ ok: true });
    }
    if (input.action === "promote") {
      await db.liveRoomParticipant.updateMany({ where: { roomId: id, userId: input.userId }, data: { role: input.role } });
      await createNotification({
        userId: input.userId,
        type: "LIVE_INVITE",
        actorId: me.id,
        title: `Your role changed in ${room.title}`,
        body: input.role === "SPEAKER" ? "You can now speak in this room." : "You are now in the audience.",
        link: `/live/${id}`,
        entityType: "LIVE_ROOM",
        entityId: id,
        dedupeKey: `live-role:${id}:${input.userId}:${input.role}:${Date.now()}`,
      });
      return json({ ok: true });
    }
    if (input.action === "remove") {
      await db.liveRoomParticipant.updateMany({
        where: { roomId: id, userId: input.userId, leftAt: null },
        data: { leftAt: new Date() },
      });
      await createNotification({
        userId: input.userId,
        type: "SYSTEM",
        actorId: me.id,
        title: `You were removed from ${room.title}`,
        link: "/live",
        entityType: "LIVE_ROOM",
        entityId: id,
        dedupeKey: `live-remove:${id}:${input.userId}`,
      });
      return json({ ok: true });
    }
    return json({ ok: true });
  });
}
