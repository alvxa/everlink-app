import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type { TokenType } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";

export async function issueToken(userId: string, type: TokenType, ttlMs: number): Promise<string> {
  await db.verificationToken.deleteMany({ where: { userId, type, usedAt: null } });
  const raw = randomBytes(32).toString("base64url");
  await db.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return raw;
}

export async function findValidToken(raw: string, type: TokenType) {
  if (!raw || raw.length < 10) return null;
  const token = await db.verificationToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt.getTime() < Date.now()) return null;
  return token;
}

const CODE_TTL_MS = 10 * 60 * 1000;

/** Six-digit single-use sign-in code. The code itself is never stored. */
export async function issueEmailLoginCode(userId: string): Promise<string> {
  await db.verificationToken.deleteMany({ where: { userId, type: "EMAIL_LOGIN", usedAt: null } });
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.verificationToken.create({
    data: {
      userId,
      type: "EMAIL_LOGIN",
      tokenHash: hashToken(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export async function findEmailLoginCode(userId: string, code: string) {
  if (!/^\d{6}$/.test(code)) return null;
  return db.verificationToken.findFirst({
    where: {
      userId,
      type: "EMAIL_LOGIN",
      tokenHash: hashToken(code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}
