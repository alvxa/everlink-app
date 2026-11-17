import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { emailCodeVerifySchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { findEmailLoginCode } from "@/server/services/tokens";

const INVALID = "That code is incorrect or has expired. Request a new one.";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "email-code:verify", 10, 15 * 60 * 1000);
    const { email, code } = await parseJson(req, emailCodeVerifySchema);

    const perEmail = await rateLimit(`email-code-verify:${email}`, 5, 10 * 60 * 1000);
    if (!perEmail.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many incorrect codes. Wait a few minutes and try again.");
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { profile: true, twoFactor: true },
    });
    if (!user || user.deletedAt || user.status !== "ACTIVE") {
      throw new ApiError(401, "INVALID_CODE", INVALID);
    }

    const record = await findEmailLoginCode(user.id, code);
    if (!record) {
      throw new ApiError(401, "INVALID_CODE", INVALID);
    }

    await db.$transaction([
      db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      db.verificationToken.deleteMany({ where: { userId: user.id, type: "EMAIL_LOGIN", usedAt: null } }),
      db.user.update({
        where: { id: user.id },
        data: {
          lastActiveAt: new Date(),
          ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
        },
      }),
    ]);

    if (user.twoFactor?.enabled) {
      await createSession(user.id, { pending2fa: true });
      return json({ ok: true, requires2fa: true });
    }

    await createSession(user.id);
    return json({
      ok: true,
      user: {
        username: user.username,
        displayName: user.profile?.displayName,
        onboarded: Boolean(user.onboardedAt),
      },
    });
  });
}
