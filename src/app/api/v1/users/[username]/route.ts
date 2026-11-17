import { json, notFound, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  return withApi(async () => {
    const { username } = await params;
    const viewer = await getCurrentUser();
    const profile = await getProfile(username, viewer?.id ?? null);
    if (!profile) throw notFound("That profile does not exist.");
    return json({ profile });
  });
}
