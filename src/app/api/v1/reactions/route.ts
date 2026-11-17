import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { reactionSchema } from "@/lib/validation";
import { toggleReaction } from "@/server/services/posts";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "reaction", 120, 60 * 60 * 1000);
    const user = await requireApiUser();
    const input = await parseJson(req, reactionSchema);
    const result = await toggleReaction(user, input.targetType, input.targetId, input.type);
    return json(result);
  });
}
