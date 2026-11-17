import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/mail";
import { issueToken } from "@/server/services/tokens";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "forgot-password", 5, 60 * 60 * 1000);
    const { email } = await parseJson(req, forgotPasswordSchema);

    // Always return success to avoid leaking which emails are registered.
    const user = await db.user.findUnique({ where: { email }, include: { profile: true } });
    if (user && !user.deletedAt && user.status === "ACTIVE") {
      const token = await issueToken(user.id, "PASSWORD_RESET", 60 * 60 * 1000);
      const delivered = await sendPasswordResetEmail(user.email, user.username, token);
      const manualResetUrl =
        !delivered && (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true")
          ? `/reset-password?token=${encodeURIComponent(token)}`
          : null;
      return json({ ok: true, manualResetUrl });
    }
    return json({ ok: true });
  });
}
