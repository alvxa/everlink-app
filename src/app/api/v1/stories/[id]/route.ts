import { db } from "@/lib/db";
import { forbidden, json, notFound, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const story = await db.story.findUnique({ where: { id }, select: { authorId: true } });
    if (!story) throw notFound("That moment no longer exists.");
    if (story.authorId !== me.id && me.role !== "ADMIN" && me.role !== "MODERATOR") {
      throw forbidden("You can only delete your own moments.");
    }
    await db.story.update({ where: { id }, data: { deletedAt: new Date() } });
    return json({ ok: true });
  });
}
