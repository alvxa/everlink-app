import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";
import { RightRail } from "@/components/app/right-rail";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/home");
  if (!user.onboardedAt) redirect("/onboarding");
  if (user.status !== "ACTIVE") redirect("/suspended");
  if (!isStaff(user) && !user.emailVerifiedAt) redirect("/verify-email?required=1");

  const memberships = await db.conversationMember.findMany({
    where: { userId: user.id, leftAt: null, archived: false, muted: false },
    select: { conversationId: true, lastReadAt: true },
  });
  const [unreadNotifications, unreadByConversation] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    Promise.all(
      memberships.map((membership) =>
        db.message.count({
          where: {
            conversationId: membership.conversationId,
            senderId: { not: user.id },
            deletedAt: null,
            ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {}),
          },
        })
      )
    ),
  ]);
  const unreadMessages = unreadByConversation.reduce((sum, count) => sum + count, 0);

  return (
    <RealtimeProvider>
      <AppShell
        user={{
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName || user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
          role: user.role,
          verified: user.verified,
        }}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        rail={<RightRail viewerId={user.id} />}
      >
        {children}
      </AppShell>
    </RealtimeProvider>
  );
}
