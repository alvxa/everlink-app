import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorSelect, getConversationMessages, getConversationSummaries, mapAuthor } from "@/lib/queries";
import { MessagesShell } from "@/components/messages/messages-shell";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const [conversations, conversation, messages] = await Promise.all([
    getConversationSummaries(user.id),
    db.conversation.findFirst({
      where: { id, members: { some: { userId: user.id, leftAt: null } } },
      include: { members: { where: { leftAt: null }, include: { user: { select: authorSelect } } } },
    }),
    getConversationMessages(id, user.id),
  ]);
  if (!conversation || !messages) notFound();

  const others = conversation.members.filter((member) => member.userId !== user.id).map((member) => mapAuthor(member.user));
  const summary = conversations.find((item) => item.id === id);

  return (
    <MessagesShell
      viewer={{
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
      }}
      conversations={conversations}
      active={{
        id: conversation.id,
        type: conversation.type,
        title: conversation.type === "DIRECT" ? others[0]?.displayName ?? "Direct message" : conversation.title || "Group conversation",
        members: conversation.members.map((member) => mapAuthor(member.user)),
        otherUser: conversation.type === "DIRECT" ? others[0] ?? null : null,
      }}
      initialMessages={messages.items}
      initialCursor={messages.nextCursor}
      initialUnread={summary?.unread ?? 0}
    />
  );
}
