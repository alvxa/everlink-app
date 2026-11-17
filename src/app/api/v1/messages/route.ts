import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { authorSelect, mapAuthor } from "@/lib/queries";

export async function GET(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return json({ messages: [] });
    const messages = await db.message.findMany({
      where: {
        deletedAt: null,
        body: { contains: q, mode: "insensitive" },
        conversation: { members: { some: { userId: me.id, leftAt: null } } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        sender: { select: authorSelect },
        conversation: { select: { id: true, type: true, title: true } },
      },
    });
    return json({
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        sender: mapAuthor(m.sender),
        conversationId: m.conversation.id,
        conversationTitle: m.conversation.title,
      })),
    });
  });
}
