import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { votePoll } from "@/server/services/posts";
import { z } from "zod";

const schema = z.object({ optionId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "poll:vote", 60, 60 * 60 * 1000);
    const { id } = await params;
    const user = await requireApiUser();
    const { optionId } = await req.json().then((body) => schema.parse(body));
    const post = await votePoll(user, id, optionId);
    return json({ post });
  });
}
