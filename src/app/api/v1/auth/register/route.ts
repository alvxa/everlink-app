import { db } from "@/lib/db";
import { ApiError, badRequest, guard, json, parseJson, withApi } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { createSession, hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { issueToken } from "@/server/services/tokens";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "register", 8, 60 * 60 * 1000);
    const input = await parseJson(req, registerSchema);

    const registrationOpen = await db.siteSetting.findUnique({ where: { key: "registrationOpen" } });
    if (registrationOpen?.value === "false") {
      throw new ApiError(403, "REGISTRATION_CLOSED", "New registrations are currently paused. Please check back soon.");
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ username: input.username }, { email: input.email }] },
      select: { username: true, email: true },
    });
    if (existing) {
      if (existing.username === input.username) {
        throw badRequest("That username is already taken.", { username: ["That username is already taken."] });
      }
      throw badRequest("An account with that email already exists.", { email: ["An account with that email already exists."] });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await db.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        dateOfBirth: new Date(input.dateOfBirth),
        profile: { create: { displayName: input.displayName.slice(0, 50) } },
        settings: { create: {} },
      },
      include: { profile: true, settings: true },
    });

    const token = await issueToken(user.id, "EMAIL_VERIFICATION", 24 * 60 * 60 * 1000);
    const delivered = await sendVerificationEmail(user.email, user.username, token);
    await createSession(user.id);

    // Without an SMTP transport the link is only written to storage/mail/outbox.log,
    // so return it to the person who just created this account. This is not email
    // verification, but it is the only way to activate an account on a server that
    // cannot send mail.
    const manualVerificationUrl = !delivered ? `/verify-email?token=${encodeURIComponent(token)}` : null;

    return json(
      {
        ok: true,
        user: {
          username: user.username,
          displayName: user.profile?.displayName,
          emailVerified: Boolean(user.emailVerifiedAt),
        },
        emailDelivered: delivered,
        manualVerificationUrl,
      },
      { status: 201 }
    );
  });
}
