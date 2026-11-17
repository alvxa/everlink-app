import { json, withApi } from "@/lib/api";
import { getTrendingHashtags } from "@/lib/queries";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 10), 30);
    return json({ hashtags: await getTrendingHashtags(limit) });
  });
}
