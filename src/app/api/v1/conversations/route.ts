import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getConversationSummaries, getConversationMessages } from "@/lib/queries";
import { conversationSchema } from "@/lib/validation";
import { createConversation } from "@/server/services/messaging";

export async function GET(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const conversations = await getConversationSummaries(me.id);
    return json({ conversations: includeArchived ? conversations : conversations.filter((c) => !c.archived) });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "conversation:create", 30, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await parseJson(req, conversationSchema);
    const id = await createConversation(me, input);
    const detail = await getConversationMessages(id, me.id);
    return json({ conversationId: id, messages: detail?.items ?? [] }, { status: 201 });
  });
}
