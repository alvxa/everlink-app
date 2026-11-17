import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { toggleBookmark } from "@/server/services/posts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "bookmark", 90, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    return json(await toggleBookmark(user, id));
  });
}
