import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { createSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "login", 15, 15 * 60 * 1000);
    const input = await parseJson(req, loginSchema);
    const email = input.email.toLowerCase();

    const perEmail = await rateLimit(`login-email:${email}`, 8, 15 * 60 * 1000);
    if (!perEmail.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many attempts for this account. Try again later.");
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { profile: true, twoFactor: true },
    });
    const valid = user ? await verifyPassword(user.passwordHash, input.password) : false;
    if (!user || !valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }
    if (user.deletedAt) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }
    if (user.status !== "ACTIVE") {
      throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Contact support for help.");
    }

    if (user.twoFactor?.enabled) {
      await createSession(user.id, { pending2fa: true });
      return json({ ok: true, requires2fa: true });
    }

    await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

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
