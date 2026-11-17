import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requireVerifiedApiUser } from "@/lib/api-session";
import { getFeedPosts } from "@/lib/queries";
import { postSchema } from "@/lib/validation";
import { createPost } from "@/server/services/posts";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const viewer = await getCurrentUser();
    const modeParam = url.searchParams.get("mode");
    const mode =
      modeParam === "following" || modeParam === "latest" || modeParam === "bookmarks" || modeParam === "for-you"
        ? modeParam
        : "for-you";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 10), 1), 30);
    const username = url.searchParams.get("author");
    let authorId: string | undefined;
    if (username) {
      const author = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
      if (!author) return json({ items: [], nextCursor: null });
      authorId = author.id;
    }
    let communityId: string | undefined;
    const communitySlug = url.searchParams.get("community");
    if (communitySlug) {
      const community = await db.community.findUnique({ where: { slug: communitySlug }, select: { id: true } });
      if (!community) return json({ items: [], nextCursor: null });
      communityId = community.id;
    }

    const result = await getFeedPosts({
      viewerId: viewer?.id ?? null,
      mode,
      cursor: url.searchParams.get("cursor"),
      limit,
      authorId,
      communityId,
      countryCode: url.searchParams.get("country") ?? undefined,
      hashtag: url.searchParams.get("hashtag") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
    });
    return json(result);
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "post:create", 20, 60 * 60 * 1000);
    const user = await requireVerifiedApiUser();
    const input = await parseJson(req, postSchema);
    const post = await createPost(user, input);
    return json({ post }, { status: 201 });
  });
}
