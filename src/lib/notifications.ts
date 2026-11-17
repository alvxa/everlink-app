import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "./db";
import { NOTIFICATION_PREF_MAP } from "./constants";
import { emitToUser } from "./realtime";
import { sendPushToUser } from "./push";

type NotificationInput = {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  title: string;
  body?: string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
};

/**
 * Creates a notification, respecting recipient preferences, skipping self-actions
 * and de-duplicating repeated events via a unique (userId, dedupeKey) constraint.
 */
export async function createNotification(input: NotificationInput) {
  if (input.actorId && input.actorId === input.userId) return null;
  const prefKey = NOTIFICATION_PREF_MAP[input.type as keyof typeof NOTIFICATION_PREF_MAP];
  if (prefKey) {
    const settings = await db.userSettings.findUnique({ where: { userId: input.userId } });
    if (settings && settings[prefKey as keyof typeof settings] === false) return null;
  }

  try {
    const notification = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        title: input.title.slice(0, 160),
        body: (input.body ?? "").slice(0, 300),
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        dedupeKey: input.dedupeKey ?? null,
      },
      include: { actor: { include: { profile: true } } },
    });
    emitToUser(input.userId, "notification:new", notification);
    void sendPushToUser(input.userId, {
      title: notification.title,
      body: notification.body,
      url: notification.link || "/notifications",
      tag: notification.id,
    }).catch(() => {});
    return notification;
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2002") return null;
    throw error;
  }
}

export async function removeNotificationByDedupe(userId: string, dedupeKey: string) {
  await db.notification.deleteMany({ where: { userId, dedupeKey } }).catch(() => {});
}

export async function unreadNotificationCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}
