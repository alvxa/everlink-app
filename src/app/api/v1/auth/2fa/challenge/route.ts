import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { completePendingSession, getPendingSession } from "@/lib/auth";
import { twoFactorCodeSchema } from "@/lib/validation";
import { decryptSecret, hashRecoveryCode, verifyTotp } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "2fa-challenge", 20, 10 * 60 * 1000);
    const pending = await getPendingSession();
    if (!pending) throw new ApiError(401, "NO_PENDING_LOGIN", "Your sign-in session has expired. Please sign in again.");

    const limit = await rateLimit(`2fa:${pending.sessionId}`, 8, 10 * 60 * 1000);
    if (!limit.success) throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try again later.");

    const { code } = await parseJson(req, twoFactorCodeSchema);
    const twoFactor = pending.user.twoFactor;
    if (!twoFactor?.enabled) throw new ApiError(400, "2FA_NOT_ENABLED", "Two-factor authentication is not enabled.");

    const normalized = code.replace(/\s/g, "");
    let valid = false;
    let usedRecoveryHash: string | null = null;

    if (/^\d{6}$/.test(normalized)) {
      try {
        valid = verifyTotp(decryptSecret(twoFactor.secret), normalized);
      } catch {
        valid = false;
      }
    }
    if (!valid && /^[A-Z0-9-]{9,12}$/i.test(normalized)) {
      const hash = hashRecoveryCode(normalized);
      if (twoFactor.recoveryCodes.includes(hash)) {
        valid = true;
        usedRecoveryHash = hash;
      }
    }
    if (!valid) throw new ApiError(401, "INVALID_2FA_CODE", "That code is not valid. Check your authenticator and try again.");

    if (usedRecoveryHash) {
      await db.twoFactor.update({
        where: { userId: pending.user.id },
        data: { recoveryCodes: twoFactor.recoveryCodes.filter((h) => h !== usedRecoveryHash) },
      });
    }

    await completePendingSession(pending.sessionId);
    await db.user.update({ where: { id: pending.user.id }, data: { lastActiveAt: new Date() } });

    return json({
      ok: true,
      usedRecoveryCode: Boolean(usedRecoveryHash),
      user: {
        username: pending.user.username,
        displayName: pending.user.profile?.displayName,
        onboarded: Boolean(pending.user.onboardedAt),
      },
    });
  });
}
