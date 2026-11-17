import { db } from "@/lib/db";
import { guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({ body: z.string().trim().min(1).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "story:reply", 40, 60 * 60 * 1000);
    const { id } = await params;
    const me = await requireApiUser();
    const story = await db.story.findFirst({
      where: { id, deletedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, authorId: true, body: true },
    });
    if (!story) throw notFound("That moment has expired.");
    const input = schema.parse(await req.json());
    const reply = await db.storyReply.create({ data: { storyId: id, userId: me.id, body: input.body } });
    await createNotification({
      userId: story.authorId,
      type: "POST_COMMENT",
      actorId: me.id,
      title: `${me.profile?.displayName || me.username} replied to your moment`,
      body: input.body.slice(0, 120),
      link: "/moments",
      entityType: "STORY",
      entityId: id,
      dedupeKey: `story-reply:${reply.id}`,
    });
    return json({ reply: { id: reply.id, body: reply.body, createdAt: reply.createdAt.toISOString() } }, { status: 201 });
  });
}
