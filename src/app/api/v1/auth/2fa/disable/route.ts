import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser, requireVerifiedApiUser } from "@/lib/api-session";
import { decryptSecret, hashRecoveryCode, verifyTotp } from "@/lib/totp";
import { verifyPassword } from "@/lib/auth";
import { sendSecurityEmail } from "@/lib/mail";

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(12),
});

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "2fa-disable", 8, 60 * 60 * 1000);
    const user = await requireVerifiedApiUser();
    const input = await parseJson(req, schema);

    const passwordOk = await verifyPassword(user.passwordHash, input.password);
    if (!passwordOk) throw new ApiError(401, "INVALID_PASSWORD", "Password is incorrect.");

    const record = await db.twoFactor.findUnique({ where: { userId: user.id } });
    if (!record?.enabled) throw new ApiError(400, "2FA_NOT_ENABLED", "Two-factor authentication is not enabled.");

    const normalized = input.code.replace(/\s/g, "");
    let valid = false;
    if (/^\d{6}$/.test(normalized)) {
      try {
        valid = verifyTotp(decryptSecret(record.secret), normalized);
      } catch {
        valid = false;
      }
    } else if (record.recoveryCodes.includes(hashRecoveryCode(normalized))) {
      valid = true;
    }
    if (!valid) throw new ApiError(401, "INVALID_2FA_CODE", "That code is not valid.");

    await db.twoFactor.update({
      where: { userId: user.id },
      data: { enabled: false, secret: "", recoveryCodes: [] },
    });
    void sendSecurityEmail(
      user.email,
      "two-factor authentication disabled",
      `Hi @${user.username}, two-factor authentication was disabled on your account. If this wasn't you, change your password immediately.`
    );

    return json({ ok: true });
  });
}
