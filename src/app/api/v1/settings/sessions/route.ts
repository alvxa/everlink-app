import { db } from "@/lib/db";
import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { hashToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

export async function GET() {
  return withApi(async () => {
    const me = await requireApiUser();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const currentHash = token ? hashToken(token) : "";
    const sessions = await db.session.findMany({
      where: { userId: me.id, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, ip: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true, tokenHash: true },
    });
    return json({
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.tokenHash === currentHash,
      })),
    });
  });
}

export async function DELETE(req: Request) {
  return withApi(async () => {
    await guard(req, "settings:sessions", 20, 60 * 60 * 1000);
    const me = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    const parsed = z.object({ id: z.string().optional(), all: z.boolean().optional() }).parse(body);
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const currentHash = token ? hashToken(token) : "";

    if (parsed.all) {
      await db.session.deleteMany({ where: { userId: me.id, tokenHash: { not: currentHash } } });
    } else if (parsed.id) {
      await db.session.deleteMany({ where: { id: parsed.id, userId: me.id, tokenHash: { not: currentHash } } });
    }
    return json({ ok: true });
  });
}
