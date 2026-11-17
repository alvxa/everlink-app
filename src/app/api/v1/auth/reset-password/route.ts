import { db } from "@/lib/db";
import { badRequest, guard, json, parseJson, withApi } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";
import { hashPassword, revokeAllSessions } from "@/lib/auth";
import { findValidToken } from "@/server/services/tokens";
import { sendSecurityEmail } from "@/lib/mail";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "reset-password", 10, 60 * 60 * 1000);
    const input = await parseJson(req, resetPasswordSchema);
    const record = await findValidToken(input.token, "PASSWORD_RESET");
    if (!record) throw badRequest("This reset link is invalid or has expired. Request a new one.");

    const passwordHash = await hashPassword(input.password);
    const user = await db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
      include: { profile: true },
    });
    await db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await revokeAllSessions(user.id);
    void sendSecurityEmail(
      user.email,
      "password changed",
      `Hi @${user.username}, your Everlink password was changed and all sessions were signed out. If this wasn't you, reset your password immediately and contact support.`
    );

    return json({ ok: true });
  });
}
