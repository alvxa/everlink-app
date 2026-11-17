import { guard, json, withApi } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "logout", 30, 60 * 1000);
    await destroyCurrentSession();
    return json({ ok: true });
  });
}
