import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    await db.notification.updateMany({ where: { id, userId: me.id }, data: { readAt: new Date() } });
    return json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await params;
    const me = await requireApiUser();
    await db.notification.deleteMany({ where: { id, userId: me.id } });
    return json({ ok: true });
  });
}
