import { guard, json, unauthorized, withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { issueToken } from "@/server/services/tokens";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "resend-verification", 5, 60 * 60 * 1000);
    const user = await getCurrentUser();
    if (!user) throw unauthorized();
    if (user.emailVerifiedAt) return json({ ok: true, alreadyVerified: true });

    const token = await issueToken(user.id, "EMAIL_VERIFICATION", 24 * 60 * 60 * 1000);
    const delivered = await sendVerificationEmail(user.email, user.username, token);
    const manualVerificationUrl = !delivered ? `/verify-email?token=${encodeURIComponent(token)}` : null;
    return json({ ok: true, emailDelivered: delivered, manualVerificationUrl });
  });
}
