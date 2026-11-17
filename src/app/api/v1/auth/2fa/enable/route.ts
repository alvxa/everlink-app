import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { twoFactorCodeSchema } from "@/lib/validation";
import { decryptSecret, generateRecoveryCodes, verifyTotp } from "@/lib/totp";
import { sendSecurityEmail } from "@/lib/mail";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "2fa-enable", 10, 60 * 60 * 1000);
    const user = await requireApiUser();
    const { code } = await parseJson(req, twoFactorCodeSchema);

    const record = await db.twoFactor.findUnique({ where: { userId: user.id } });
    if (!record) throw new ApiError(400, "2FA_NOT_SETUP", "Start two-factor setup first.");
    if (record.enabled) throw new ApiError(409, "2FA_ENABLED", "Two-factor authentication is already enabled.");

    let valid = false;
    try {
      valid = verifyTotp(decryptSecret(record.secret), code.replace(/\s/g, ""));
    } catch {
      valid = false;
    }
    if (!valid) throw new ApiError(400, "INVALID_2FA_CODE", "That code is not valid. Make sure your device clock is correct.");

    const { codes, hashes } = generateRecoveryCodes();
    await db.twoFactor.update({
      where: { userId: user.id },
      data: { enabled: true, recoveryCodes: hashes },
    });
    void sendSecurityEmail(
      user.email,
      "two-factor authentication enabled",
      `Hi @${user.username}, two-factor authentication was enabled on your account. If this wasn't you, secure your account immediately.`
    );

    return json({ ok: true, recoveryCodes: codes });
  });
}
