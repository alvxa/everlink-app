import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "everlink_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = Prisma.UserGetPayload<{
  include: { profile: true; settings: true; twoFactor: true };
}>;

export type SessionInfo = {
  user: SessionUser;
  sessionId: string;
  pending2fa: boolean;
  expiresAt: Date;
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const generateToken = () => randomBytes(32).toString("base64url");

export function hashPassword(password: string) {
  // Argon2id with OWASP-recommended baseline parameters (19 MiB, t=2, p=1).
  return hash(password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function createSession(userId: string, opts: { pending2fa?: boolean } = {}) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 255) ?? null;

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      pending2fa: opts.pending2fa ?? false,
      expiresAt,
      ip,
      userAgent,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { token, expiresAt };
}

export async function completePendingSession(sessionId: string) {
  await db.session.update({ where: { id: sessionId }, data: { pending2fa: false, lastSeenAt: new Date() } });
}

async function loadSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return loadSessionByToken(token);
}

export async function loadSessionByToken(token: string): Promise<SessionInfo | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true, settings: true, twoFactor: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "ACTIVE" || session.user.deletedAt) return null;
  return {
    user: session.user,
    sessionId: session.id,
    pending2fa: session.pending2fa,
    expiresAt: session.expiresAt,
  };
}

/** The signed-in user for the current request, cached per render. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await loadSession();
  if (!session || session.pending2fa) return null;
  return session.user;
});

export const getPendingSession = cache(async (): Promise<SessionInfo | null> => {
  const session = await loadSession();
  if (!session || !session.pending2fa) return null;
  return session;
});

export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

export function isStaff(user: { role: string }) {
  return user.role === "ADMIN" || user.role === "MODERATOR";
}

export function isAdmin(user: { role: string }) {
  return user.role === "ADMIN";
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaff(user)) redirect("/home");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/home");
  return user;
}

export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) {
    redirect("/verify-email?required=1");
  }
  return user;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

export async function touchSession(sessionId: string) {
  await db.session
    .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
}
