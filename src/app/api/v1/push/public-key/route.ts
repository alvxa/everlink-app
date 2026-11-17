import { guard, json, withApi } from "@/lib/api";
import { pushConfigured } from "@/lib/push";

export async function GET(req: Request) {
  return withApi(async () => {
    await guard(req, "push:public-key", 60, 60 * 60 * 1000);
    if (!pushConfigured()) {
      return json({ error: { code: "PUSH_NOT_CONFIGURED", message: "Web push is not configured on this server." } }, { status: 503 });
    }
    return json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });
}
