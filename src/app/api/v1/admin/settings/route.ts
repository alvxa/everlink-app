import { db } from "@/lib/db";
import { guard, json, withApi } from "@/lib/api";
import { requireAdminApi, requireStaffApi } from "@/lib/api-session";
import { adminSettingsSchema } from "@/lib/validation";

export async function GET() {
  return withApi(async () => {
    await requireStaffApi();
    const rows = await db.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return json({
      settings: {
        registrationOpen: settings.registrationOpen ?? "true",
      },
      env: {
        smtpConfigured: Boolean(process.env.SMTP_HOST),
        translationConfigured: Boolean(process.env.TRANSLATION_PROVIDER),
        redisConfigured: Boolean(process.env.REDIS_URL),
        pushConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        turnConfigured: Boolean(process.env.TURN_URLS || process.env.TURN_URL),
      },
    });
  });
}

export async function PATCH(req: Request) {
  return withApi(async () => {
    await guard(req, "admin:settings", 20, 60 * 60 * 1000);
    const admin = await requireAdminApi();
    const input = adminSettingsSchema.parse(await req.json());
    const entries = Object.entries(input).filter(([, value]) => value !== undefined) as [string, string][];
    for (const [key, value] of entries) {
      await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "admin.settings.update",
        targetType: "SITE",
        metadata: input,
      },
    });
    return json({ ok: true });
  });
}
