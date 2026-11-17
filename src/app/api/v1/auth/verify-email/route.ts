import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, guard, json, parseJson, withApi } from "@/lib/api";
import { findValidToken } from "@/server/services/tokens";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "verify-email", 20, 60 * 60 * 1000);
    const { token } = await parseJson(req, schema);
    const record = await findValidToken(token, "EMAIL_VERIFICATION");
    if (!record) {
      throw badRequest("This verification link is invalid or has expired. Request a new one.");
    }

    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    await createNotification({
      userId: record.userId,
      type: "SYSTEM",
      title: "Your email is verified",
      body: "You can now post, comment, message and join communities.",
      link: "/home",
      dedupeKey: "email-verified",
    });

    return json({ ok: true });
  });
}
