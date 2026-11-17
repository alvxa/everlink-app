import { db } from "@/lib/db";
import { badRequest, guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { hashPassword, revokeAllSessions, verifyPassword } from "@/lib/auth";
import { sendSecurityEmail } from "@/lib/mail";
import { z } from "zod";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/),
    revokeOthers: z.boolean().default(true),
  })
  .refine((v) => v.currentPassword !== v.newPassword, { message: "Choose a new password.", path: ["newPassword"] });

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "settings:password", 10, 60 * 60 * 1000);
    const me = await requireApiUser();
    const input = await req.json().then((body) => schema.parse(body));

    if (!(await verifyPassword(me.passwordHash, input.currentPassword))) {
      throw badRequest("Your current password is incorrect.", { currentPassword: ["Your current password is incorrect."] });
    }

    await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
    if (input.revokeOthers) await revokeAllSessions(me.id);
    await db.auditLog.create({
      data: { actorId: me.id, action: "account.password.change", targetType: "USER", targetId: me.id },
    });
    await sendSecurityEmail(
      me.email,
      "password changed",
      "Your Everlink password was changed. If this was not you, reset your password immediately and contact support."
    );
    return json({ ok: true, sessionsRevoked: input.revokeOthers });
  });
}
