import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getConversationMessages } from "@/lib/queries";
import { messageSchema } from "@/lib/validation";
import { sendMessage } from "@/server/services/messaging";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const url = new URL(req.url);
    const page = await getConversationMessages(id, me.id, url.searchParams.get("cursor"));
    if (!page) return json({ error: { code: "NOT_FOUND", message: "That conversation is not available." } }, { status: 404 });
    return json({ messages: page.items, nextCursor: page.nextCursor });
  });
}

export async function POST(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "message:send", 120, 60 * 60 * 1000);
    const { id } = await params;
    const me = await requireApiUser();
    const input = await parseJson(req, messageSchema);
    const message = await sendMessage(me, id, input);
    return json({ message }, { status: 201 });
  });
}
