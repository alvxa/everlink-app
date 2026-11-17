import { json, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSuggestedPeople } from "@/lib/queries";

export async function GET(req: Request) {
  return withApi(async () => {
    const url = new URL(req.url);
    const viewer = await getCurrentUser();
    const people = await getSuggestedPeople({
      viewerId: viewer?.id ?? null,
      q: url.searchParams.get("q") ?? undefined,
      interest: url.searchParams.get("interest") ?? undefined,
      language: url.searchParams.get("language") ?? undefined,
      country: url.searchParams.get("country") ?? undefined,
      sort: (url.searchParams.get("sort") as "popular" | "new" | "recent" | null) ?? "popular",
      limit: Math.min(Number(url.searchParams.get("limit") || 12), 40),
    });
    return json({ people });
  });
}
