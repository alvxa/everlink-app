import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { commentSchema } from "@/lib/validation";
import { createComment, getPostComments } from "@/server/services/posts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return withApi(async () => {
    const { id } = await params;
    const user = await requireApiUser();
    const comments = await getPostComments(id, user);
    return json({ comments });
  });
}

export async function POST(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "comment:create", 60, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    const input = await parseJson(req, commentSchema);
    const comment = await createComment(user, id, input);
    return json({ comment }, { status: 201 });
  });
}
