import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getConversationSummaries } from "@/lib/queries";
import { MessagesShell } from "@/components/messages/messages-shell";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const conversations = await getConversationSummaries(user.id);

  return (
    <MessagesShell
      viewer={{
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
      }}
      conversations={conversations}
    />
  );
}
