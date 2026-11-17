import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { connectStatus, endMatch, joinQueue, leaveQueue } from "@/server/connect";
import { connectPreferencesSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    return json(connectStatus(me.id));
  });
}

const actionSchema = z.object({
  action: z.enum(["join", "leave", "skip"]),
  topics: z.array(z.string()).max(10).default([]),
  language: z.string().min(2).max(8).nullable().optional(),
});

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "connect:action", 60, 60 * 60 * 1000);
    const me = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    const { action, ...prefs } = actionSchema.parse(body);

    if (action === "leave") return json(await leaveQueue(me.id));
    if (action === "skip") {
      await endMatch(me.id);
      await leaveQueue(me.id);
      return json(connectStatus(me.id));
    }

    const parsed = connectPreferencesSchema.parse(prefs);
    const result = await joinQueue(me, {
      topics: parsed.topics.map(String),
      language: parsed.language ?? null,
    });
    if (result.status === "matched") {
      return json({ ...connectStatus(me.id), ...result });
    }
    return json({ status: "waiting" });
  });
}
