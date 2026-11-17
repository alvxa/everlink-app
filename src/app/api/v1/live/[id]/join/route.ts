import { db } from "@/lib/db";
import { forbidden, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const room = await db.liveRoom.findUnique({
      where: { id },
      select: { id: true, type: true, hostId: true, status: true },
    });
    if (!room) throw notFound("That room does not exist.");
    if (room.status !== "LIVE") throw forbidden("This room has ended.");
    if (room.type === "PRIVATE" && room.hostId !== me.id) {
      const invite = await db.notification.findFirst({
        where: { userId: me.id, type: "LIVE_INVITE", entityType: "LIVE_ROOM", entityId: id },
      });
      if (!invite) throw forbidden("This private room requires an invitation.");
    }
    await db.liveRoomParticipant.upsert({
      where: { roomId_userId: { roomId: id, userId: me.id } },
      create: { roomId: id, userId: me.id, role: room.hostId === me.id ? "HOST" : "AUDIENCE" },
      update: { leftAt: null, joinedAt: new Date() },
    });
    return json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    await db.liveRoomParticipant.updateMany({
      where: { roomId: id, userId: me.id, leftAt: null },
      data: { leftAt: new Date() },
    });
    return json({ ok: true });
  });
}
