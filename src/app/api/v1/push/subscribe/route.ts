import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "push:subscribe", 30, 60 * 60 * 1000);
    const user = await requireApiUser();
    const input = await parseJson(req, pushSubscriptionSchema);

    await db.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
      },
      update: {
        userId: user.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
      },
    });

    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withApi(async () => {
    await guard(req, "push:unsubscribe", 30, 60 * 60 * 1000);
    const user = await requireApiUser();
    const input = await parseJson(req, pushUnsubscribeSchema);
    await db.pushSubscription.deleteMany({ where: { endpoint: input.endpoint, userId: user.id } });
    return json({ ok: true });
  });
}
