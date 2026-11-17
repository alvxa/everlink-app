import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { removeComment } from "@/server/services/posts";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "comment:delete", 60, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    await removeComment(user, id);
    return json({ ok: true });
  });
}
