import { guard, json, parseJson, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requireApiUser } from "@/lib/api-session";
import { getPostById } from "@/lib/queries";
import { postUpdateSchema } from "@/lib/validation";
import { removePost, updatePost } from "@/server/services/posts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { id } = await params;
    const viewer = await getCurrentUser();
    const post = await getPostById(id, viewer?.id ?? null);
    if (!post) return json({ error: { code: "NOT_FOUND", message: "That post is not available." } }, { status: 404 });
    return json({ post });
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "post:update", 40, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    const input = await parseJson(req, postUpdateSchema);
    const post = await updatePost(user, id, input);
    return json({ post });
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "post:delete", 40, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    await removePost(user, id);
    return json({ ok: true });
  });
}
