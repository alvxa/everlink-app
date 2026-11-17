import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { onboardingSchema } from "@/lib/validation";
import { assertUploadOwnership } from "@/lib/storage";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "onboarding", 10, 60 * 60 * 1000);
    const user = await requireApiUser();
    const input = await parseJson(req, onboardingSchema);

    if (input.avatarUrl) {
      await assertUploadOwnership(user.id, [input.avatarUrl], "AVATAR");
    }

    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } }),
      db.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          displayName: input.displayName,
          bio: input.bio,
          avatarUrl: input.avatarUrl ?? null,
          countryCode: input.countryCode ?? null,
        },
        update: {
          displayName: input.displayName,
          bio: input.bio,
          avatarUrl: input.avatarUrl ?? null,
          countryCode: input.countryCode ?? null,
        },
      }),
      db.userSettings.upsert({
        where: { userId: user.id },
        create: { userId: user.id, discoverable: input.discoverable, showCountry: input.showCountry },
        update: { discoverable: input.discoverable, showCountry: input.showCountry },
      }),
      db.userInterest.deleteMany({ where: { userId: user.id } }),
      db.userInterest.createMany({
        data: input.interests.map((name) => ({ userId: user.id, name: String(name) })),
        skipDuplicates: true,
      }),
      db.userLanguage.deleteMany({ where: { userId: user.id } }),
      db.userLanguage.createMany({
        data: input.languages.map((code) => ({ userId: user.id, code: String(code) })),
        skipDuplicates: true,
      }),
    ]);

    return json({ ok: true });
  });
}
