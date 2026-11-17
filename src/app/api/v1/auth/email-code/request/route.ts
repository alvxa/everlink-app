import { db } from "@/lib/db";
import { ApiError, guard, json, parseJson, withApi } from "@/lib/api";
import { emailCodeRequestSchema } from "@/lib/validation";
import { sendSignInCodeEmail } from "@/lib/mail";
import { issueEmailLoginCode } from "@/server/services/tokens";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "email-code:request", 6, 60 * 60 * 1000);
    const { email } = await parseJson(req, emailCodeRequestSchema);

    const perEmail = await rateLimit(`email-code-request:${email}`, 3, 15 * 60 * 1000);
    if (!perEmail.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many code requests. Wait a few minutes and try again.");
    }

    // The response never reveals whether the address belongs to an account.
    const user = await db.user.findUnique({ where: { email } });
    if (user && !user.deletedAt && user.status === "ACTIVE") {
      const code = await issueEmailLoginCode(user.id);
      await sendSignInCodeEmail(user.email, user.username, code);
    }

    return json({ ok: true });
  });
}
