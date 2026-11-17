import { db } from "@/lib/db";
import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { getNotifications } from "@/lib/queries";
import { z } from "zod";

export async function GET(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    if (unreadOnly) {
      const items = await db.notification.findMany({
        where: { userId: me.id, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { username: true, verified: true, id: true, profile: true } } },
      });
      return json({
        items: items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
          actor: n.actor
            ? {
                id: n.actor.id,
                username: n.actor.username,
                displayName: n.actor.profile?.displayName || n.actor.username,
                avatarUrl: n.actor.profile?.avatarUrl ?? null,
                verified: n.actor.verified,
                countryCode: n.actor.profile?.countryCode ?? null,
              }
            : null,
        })),
        unreadCount: items.length,
      });
    }
    const page = await getNotifications(me.id, url.searchParams.get("cursor"));
    const unreadCount = await db.notification.count({ where: { userId: me.id, readAt: null } });
    return json({ ...page, unreadCount });
  });
}

const patchSchema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.string()).max(100).optional(),
});

export async function PATCH(req: Request) {
  return withApi(async () => {
    await guard(req, "notifications:read", 200, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = patchSchema.parse(await req.json());
    if (input.all) {
      await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
    } else if (input.ids?.length) {
      await db.notification.updateMany({
        where: { userId: me.id, id: { in: input.ids }, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withApi(async () => {
    const me = await requireApiUser();
    const input = patchSchema.parse(await req.json());
    if (input.all) await db.notification.deleteMany({ where: { userId: me.id } });
    else if (input.ids?.length) await db.notification.deleteMany({ where: { userId: me.id, id: { in: input.ids } } });
    return json({ ok: true });
  });
}
