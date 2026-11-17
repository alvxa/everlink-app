import { db } from "@/lib/db";
import { forbidden, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { authorSelect, mapAuthor } from "@/lib/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const story = await db.story.findUnique({ where: { id }, select: { authorId: true } });
    if (!story) throw notFound("That moment no longer exists.");
    if (story.authorId !== me.id && me.role === "USER") throw forbidden("Only the author can see the viewer list.");
    const views = await db.storyView.findMany({
      where: { storyId: id },
      orderBy: { viewedAt: "desc" },
      take: 100,
      include: { viewer: { select: authorSelect } },
    });
    return json({ viewers: views.map((v) => ({ ...mapAuthor(v.viewer), viewedAt: v.viewedAt.toISOString() })) });
  });
}
