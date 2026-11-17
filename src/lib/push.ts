import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { db } from "./db";

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

let ready: boolean | null = null;

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureVapid() {
  if (ready !== null) return ready;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    ready = false;
    return false;
  }
  setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:no-reply@everlink.local",
    publicKey,
    privateKey
  );
  ready = true;
  return true;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) return;
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          { TTL: 60 * 60 }
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
          return;
        }
        console.warn("[push] delivery failed", status ?? "unknown");
      }
    })
  );
}
