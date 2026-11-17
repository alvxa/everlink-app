import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { z } from "zod";

export async function GET() {
  return withApi(async () => {
    await requireStaffApi();
    const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return json({ messages });
  });
}

export async function PATCH(req: Request) {
  return withApi(async () => {
    await requireStaffApi();
    const input = z.object({ id: z.string().min(1), resolved: z.boolean() }).parse(await req.json());
    await db.contactMessage.update({
      where: { id: input.id },
      data: { resolvedAt: input.resolved ? new Date() : null },
    });
    return json({ ok: true });
  });
}
