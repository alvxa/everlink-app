import { db } from "@/lib/db";
import { badRequest, guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { communityEventSchema } from "@/lib/validation";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "community:event", 20, 60 * 60 * 1000);
    const { slug } = await params;
    const me = await requireApiUser();
    const community = await db.community.findFirst({
      where: { slug, suspendedAt: null },
      select: { id: true, name: true },
    });
    if (!community) throw notFound("That community does not exist.");
    const membership = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: me.id } },
    });
    if (!membership || !["OWNER", "ADMIN", "MODERATOR"].includes(membership.role)) {
      throw badRequest("Only community organizers can create events.");
    }
    const input = await req.json().then((body) => communityEventSchema.parse(body));
    const startsAt = new Date(input.startsAt);
    if (startsAt.getTime() < Date.now() - 60 * 60 * 1000) throw badRequest("Choose a future start time.");
    const event = await db.event.create({
      data: {
        communityId: community.id,
        creatorId: me.id,
        title: input.title,
        description: input.description,
        startsAt,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        locationText: input.locationText ?? null,
        onlineUrl: input.onlineUrl ?? null,
      },
    });
    return json({ event }, { status: 201 });
  });
}

export async function GET(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { slug } = await params;
    const community = await db.community.findFirst({ where: { slug }, select: { id: true } });
    if (!community) throw notFound("That community does not exist.");
    const events = await db.event.findMany({
      where: { communityId: community.id, startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { startsAt: "asc" },
      take: 30,
    });
    return json({ events });
  });
}
