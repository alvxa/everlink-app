import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityList, getFeedPosts, getSuggestedPeople, getWorldOverview } from "@/lib/queries";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const code = (url.searchParams.get("country") ?? "").toUpperCase();
    const viewer = await getCurrentUser();
    const overview = await getWorldOverview();

    if (!/^[A-Z]{2}$/.test(code)) {
      return json({
        countries: overview,
        totals: {
          members: overview.reduce((s, c) => s + c.members, 0),
          posts: overview.reduce((s, c) => s + c.posts, 0),
          communities: overview.reduce((s, c) => s + c.communities, 0),
          countries: overview.length,
        },
      });
    }

    const [posts, communities, people] = await Promise.all([
      getFeedPosts({ viewerId: viewer?.id ?? null, countryCode: code, limit: 10 }),
      getCommunityList({ country: code, viewerId: viewer?.id ?? null, limit: 8 }),
      getSuggestedPeople({ country: code, viewerId: viewer?.id ?? null, limit: 8 }),
    ]);

    const stats = overview.find((c) => c.code === code) ?? { code, members: 0, posts: 0, communities: 0 };
    return json({ country: stats, posts: posts.items, communities, people });
  });
}
