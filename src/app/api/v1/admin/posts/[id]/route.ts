import { guard, json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { removePost } from "@/server/services/posts";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "admin:post-delete", 60, 60 * 60 * 1000);
    const staff = await requireStaffApi();
    const { id } = await params;
    await removePost(staff, id);
    return json({ ok: true });
  });
}
