import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getStoryFeed } from "@/lib/queries";
import { storySchema } from "@/lib/validation";
import { assertUploadOwnership } from "@/lib/storage";
import { STORY_LIFETIME_MS } from "@/lib/constants";

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const groups = await getStoryFeed(me.id);
    return json({ groups });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "story:create", 20, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await parseJson(req, storySchema);
    if (input.mediaUrl) await assertUploadOwnership(me.id, [input.mediaUrl], "STORY");

    const story = await db.story.create({
      data: {
        authorId: me.id,
        type: input.type,
        mediaUrl: input.type === "TEXT" ? null : input.mediaUrl,
        body: input.body,
        background: input.background,
        audience: input.audience,
        expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
      },
      select: { id: true, expiresAt: true },
    });
    return json({ story }, { status: 201 });
  });
}
