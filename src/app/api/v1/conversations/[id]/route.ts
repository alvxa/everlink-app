import { db } from "@/lib/db";
import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { authorSelect, getConversationMessages, mapAuthor } from "@/lib/queries";
import { leaveConversation, updateConversation } from "@/server/services/messaging";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    const url = new URL(req.url);
    const [conversation, messages] = await Promise.all([
      db.conversation.findFirst({
        where: { id, members: { some: { userId: me.id, leftAt: null } } },
        include: {
          members: { where: { leftAt: null }, include: { user: { select: authorSelect } } },
        },
      }),
      getConversationMessages(id, me.id, url.searchParams.get("cursor")),
    ]);
    if (!conversation || !messages) {
      return json({ error: { code: "NOT_FOUND", message: "That conversation is not available." } }, { status: 404 });
    }
    const others = conversation.members.filter((m) => m.userId !== me.id).map((m) => mapAuthor(m.user));
    return json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        title: conversation.type === "DIRECT" ? others[0]?.displayName ?? "Direct message" : conversation.title || "Group conversation",
        members: conversation.members.map((m) => mapAuthor(m.user)),
        otherUser: conversation.type === "DIRECT" ? others[0] ?? null : null,
      },
      messages: messages.items,
      nextCursor: messages.nextCursor,
    });
  });
}

const patchSchema = z.object({
  archived: z.boolean().optional(),
  muted: z.boolean().optional(),
  title: z.string().trim().min(1).max(80).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApi(async () => {
    await guard(req, "conversation:update", 60, 60 * 60 * 1000);
    const { id } = await params;
    const me = await requireApiUser();
    const input = patchSchema.parse(await req.json());
    return json(await updateConversation(me, id, input));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    return json(await leaveConversation(me, id));
  });
}
