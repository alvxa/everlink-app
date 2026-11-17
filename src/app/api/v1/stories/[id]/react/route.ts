import { db } from "@/lib/db";
import { guard, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const reactSchema = z.object({ type: z.enum(["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"]).default("LOVE") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "story:react", 80, 60 * 60 * 1000);
    const { id } = await params;
    const me = await requireApiUser();
    const story = await db.story.findFirst({
      where: { id, deletedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, authorId: true },
    });
    if (!story) throw notFound("That moment has expired.");
    const { type } = reactSchema.parse(await req.json().catch(() => ({})));
    const existing = await db.storyReaction.findUnique({
      where: { storyId_userId: { storyId: id, userId: me.id } },
    });
    if (existing) {
      await db.storyReaction.delete({ where: { id: existing.id } });
      return json({ reacted: false });
    }
    await db.storyReaction.create({ data: { storyId: id, userId: me.id, type } });
    await createNotification({
      userId: story.authorId,
      type: "POST_LIKE",
      actorId: me.id,
      title: `${me.profile?.displayName || me.username} reacted to your moment`,
      link: "/moments",
      entityType: "STORY",
      entityId: id,
      dedupeKey: `story-reaction:${id}:${me.id}`,
    });
    return json({ reacted: true });
  });
}
