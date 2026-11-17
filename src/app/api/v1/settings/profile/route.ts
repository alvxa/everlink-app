import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { profileSchema } from "@/lib/validation";
import { assertUploadOwnership } from "@/lib/storage";
import { z } from "zod";
import { INTERESTS, LANGUAGES } from "@/lib/constants";

const interestsSchema = z.object({
  interests: z.array(z.enum(INTERESTS as unknown as [string, ...string[]])).max(15),
  languages: z.array(z.enum(LANGUAGES.map((l) => l.code) as [string, ...string[]])).max(10),
});

export async function PATCH(req: Request) {
  return withApi(async () => {
    await guard(req, "settings:profile", 40, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await parseJson(req, profileSchema);

    if (input.avatarUrl) await assertUploadOwnership(me.id, [input.avatarUrl], "AVATAR");
    if (input.coverUrl) await assertUploadOwnership(me.id, [input.coverUrl], "COVER");

    const mediaPatch = {
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
    };

    const profile = await db.profile.upsert({
      where: { userId: me.id },
      create: {
        userId: me.id,
        displayName: input.displayName,
        bio: input.bio ?? "",
        avatarUrl: input.avatarUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        countryCode: input.countryCode ?? null,
        website: input.website ?? null,
        pronouns: input.pronouns ?? null,
      },
      update: {
        displayName: input.displayName,
        bio: input.bio ?? "",
        countryCode: input.countryCode ?? null,
        website: input.website ?? null,
        pronouns: input.pronouns ?? null,
        ...mediaPatch,
      },
    });
    return json({ profile });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "settings:interests", 30, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = interestsSchema.parse(await req.json());

    await db.$transaction([
      db.userInterest.deleteMany({ where: { userId: me.id } }),
      db.userInterest.createMany({
        data: input.interests.map((name) => ({ userId: me.id, name })),
        skipDuplicates: true,
      }),
      db.userLanguage.deleteMany({ where: { userId: me.id } }),
      db.userLanguage.createMany({
        data: input.languages.map((code) => ({ userId: me.id, code })),
        skipDuplicates: true,
      }),
    ]);
    return json({ ok: true });
  });
}
