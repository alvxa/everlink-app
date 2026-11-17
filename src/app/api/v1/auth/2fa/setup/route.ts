import QRCode from "qrcode";
import { db } from "@/lib/db";
import { ApiError, guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { encryptSecret, generateTotpSecret, otpauthUrl } from "@/lib/totp";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "2fa-setup", 10, 60 * 60 * 1000);
    const user = await requireApiUser();
    if (user.twoFactor?.enabled) {
      throw new ApiError(409, "2FA_ENABLED", "Two-factor authentication is already enabled. Disable it first to reset.");
    }

    const secret = generateTotpSecret();
    await db.twoFactor.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secret: encryptSecret(secret), enabled: false },
      update: { secret: encryptSecret(secret), enabled: false },
    });

    const uri = otpauthUrl(user.username, secret);
    const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240, color: { dark: "#111827", light: "#ffffff" } });
    return json({ ok: true, secret, otpauthUrl: uri, qrDataUrl });
  });
}
