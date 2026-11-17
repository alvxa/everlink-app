import { db } from "@/lib/db";
import { badRequest, guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { translateText } from "@/lib/translation";
import { translateSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "translate", 80, 60 * 60 * 1000);
    await requireApiUser();
    const input = await req.json().then((body) => translateSchema.parse(body));

    if (input.sourceType && input.sourceId) {
      const cached = await db.translation.findUnique({
        where: {
          sourceType_sourceId_targetLang: {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            targetLang: input.targetLang,
          },
        },
      });
      if (cached) {
        return json({ text: cached.translatedText, provider: cached.provider, cached: true });
      }
    }

    const result = await translateText(input.text, input.targetLang);

    if (input.sourceType && input.sourceId) {
      await db.translation
        .upsert({
          where: {
            sourceType_sourceId_targetLang: {
              sourceType: input.sourceType,
              sourceId: input.sourceId,
              targetLang: input.targetLang,
            },
          },
          create: {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            targetLang: input.targetLang,
            translatedText: result.text,
            provider: result.provider,
          },
          update: { translatedText: result.text, provider: result.provider },
        })
        .catch(() => {});
    }

    if (!result.text) throw badRequest("The translation provider returned an empty result.");
    return json({ ...result, cached: false });
  });
}
