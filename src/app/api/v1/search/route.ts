import { json, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { globalSearch } from "@/lib/queries";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return json({ people: [], posts: [], communities: [], hashtags: [] });
    const viewer = await getCurrentUser();
    const results = await globalSearch(q, viewer?.id ?? null);
    return json(results);
  });
}
