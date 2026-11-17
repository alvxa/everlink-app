import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { repost } from "@/server/services/posts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "repost", 30, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    const post = await repost(user, id);
    return json({ post }, { status: 201 });
  });
}
