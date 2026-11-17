import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getLiveRooms } from "@/lib/queries";
import { liveRoomSchema } from "@/lib/validation";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const rooms = await getLiveRooms(Math.min(Number(url.searchParams.get("limit") || 20), 50));
    return json({ rooms });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "live:create", 10, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await parseJson(req, liveRoomSchema);

    if (input.communityId) {
      const membership = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId: input.communityId, userId: me.id } },
      });
      if (!membership) throw new ApiError(403, "FORBIDDEN", "Join the community before hosting a room for it.");
    }

    const room = await db.liveRoom.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        topic: input.topic ?? null,
        countryCode: input.countryCode ?? null,
        communityId: input.communityId ?? null,
        hostId: me.id,
        participants: { create: { userId: me.id, role: "HOST", muted: false, cameraOn: false } },
      },
      select: { id: true },
    });
    return json({ room }, { status: 201 });
  });
}
