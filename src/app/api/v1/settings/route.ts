import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { settingsSchema } from "@/lib/validation";

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const settings = await db.userSettings.upsert({
      where: { userId: me.id },
      create: { userId: me.id },
      update: {},
    });
    return json({ settings });
  });
}

export async function PATCH(req: Request) {
  return withApi(async () => {
    await guard(req, "settings:preferences", 60, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await parseJson(req, settingsSchema);
    const settings = await db.userSettings.upsert({
      where: { userId: me.id },
      create: { userId: me.id, ...input },
      update: input,
    });
    return json({ settings });
  });
}
