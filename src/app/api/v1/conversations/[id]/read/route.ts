import { json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { markRead } from "@/server/services/messaging";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    return json(await markRead(me, id));
  });
}
