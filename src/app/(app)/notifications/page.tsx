import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [page, unread] = await Promise.all([
    getNotifications(user.id),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <div className="px-4 pb-8 pt-5 sm:px-6">
      <NotificationList initialItems={page.items} initialCursor={page.nextCursor} initialUnread={unread} />
    </div>
  );
}
