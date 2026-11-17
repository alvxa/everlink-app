import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requireApiUser } from "@/lib/api-session";
import { getCommunityList } from "@/lib/queries";
import { communitySchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const viewer = await getCurrentUser();
    const communities = await getCommunityList({
      search: url.searchParams.get("q") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      country: url.searchParams.get("country") ?? undefined,
      language: url.searchParams.get("language") ?? undefined,
      joined: url.searchParams.get("joined") === "1",
      viewerId: viewer?.id ?? null,
      limit: Math.min(Number(url.searchParams.get("limit") || 24), 48),
    });
    return json({ communities });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "community:create", 5, 24 * 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await parseJson(req, communitySchema);
    const baseSlug = input.slug || slugify(input.name);
    if (!baseSlug || baseSlug.length < 3) {
      throw new ApiError(400, "BAD_REQUEST", "Choose a longer community name.");
    }
    let slug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const exists = await db.community.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      slug = `${baseSlug}-${i + 2}`;
    }

    const community = await db.community.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        type: input.type,
        countryCode: input.countryCode ?? null,
        language: input.language,
        imageUrl: input.imageUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        guidelines: input.guidelines,
        ownerId: me.id,
        members: { create: { userId: me.id, role: "OWNER" } },
      },
      select: { id: true, slug: true },
    });
    return json({ community }, { status: 201 });
  });
}
