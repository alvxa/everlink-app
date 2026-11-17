import { db } from "@/lib/db";
import { json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const story = await db.story.findFirst({
      where: { id, deletedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, authorId: true },
    });
    if (!story) throw notFound("That moment has expired.");
    await db.storyView.upsert({
      where: { storyId_viewerId: { storyId: id, viewerId: me.id } },
      create: { storyId: id, viewerId: me.id },
      update: { viewedAt: new Date() },
    });
    return json({ ok: true });
  });
}
