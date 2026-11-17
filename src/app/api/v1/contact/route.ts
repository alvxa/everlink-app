import { db } from "@/lib/db";
import { guard, json, parseJson, withApi } from "@/lib/api";
import { contactSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";
import { sanitizeText } from "@/lib/utils";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "contact", 3, 60 * 60 * 1000);
    const input = await parseJson(req, contactSchema);

    const message = await db.contactMessage.create({
      data: {
        name: sanitizeText(input.name),
        email: input.email,
        subject: sanitizeText(input.subject),
        body: sanitizeText(input.body),
      },
    });

    const admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "MODERATOR"] }, status: "ACTIVE", deletedAt: null },
      select: { id: true },
      take: 20,
    });
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          type: "SYSTEM",
          title: "New contact message",
          body: `${input.subject} (from ${input.name})`,
          link: "/admin/settings",
          entityType: "CONTACT",
          entityId: message.id,
          dedupeKey: `contact:${message.id}`,
        })
      )
    );

    return json({ ok: true });
  });
}
