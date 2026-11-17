import { db } from "@/lib/db";
import { badRequest, forbidden, guard, json, notFound, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { adminUserActionSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";
import { revokeAllSessions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await guard(req, "admin:user-action", 60, 60 * 60 * 1000);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = adminUserActionSchema.parse(await req.json());

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, status: true, email: true },
    });
    if (!target) throw notFound("That account does not exist.");
    if (target.id === staff.id) throw badRequest("You cannot apply this action to your own account.");

    const isRoleAction = ["MAKE_MODERATOR", "MAKE_USER", "MAKE_ADMIN"].includes(input.action);
    if (isRoleAction && staff.role !== "ADMIN") throw forbidden("Only administrators can change roles.");
    if (input.action === "MAKE_ADMIN" && target.role === "ADMIN") throw badRequest("That account is already an administrator.");
    if (input.action === "SUSPEND" && target.role === "ADMIN" && staff.role !== "ADMIN") {
      throw forbidden("Only administrators can suspend another administrator.");
    }

    const data: {
      status?: "ACTIVE" | "SUSPENDED";
      role?: "USER" | "MODERATOR" | "ADMIN";
      suspendedReason?: string | null;
      suspendedAt?: Date | null;
      verified?: boolean;
      emailVerifiedAt?: Date | null;
    } = {};

    if (input.action === "SUSPEND") {
      data.status = "SUSPENDED";
      data.suspendedAt = new Date();
      data.suspendedReason = input.reason || "Violation of the Everlink community guidelines.";
      await revokeAllSessions(target.id);
    }
    if (input.action === "RESTORE") {
      data.status = "ACTIVE";
      data.suspendedAt = null;
      data.suspendedReason = null;
    }
    if (input.action === "MAKE_MODERATOR") data.role = "MODERATOR";
    if (input.action === "MAKE_USER") data.role = "USER";
    if (input.action === "MAKE_ADMIN") data.role = "ADMIN";
    if (input.action === "VERIFY") {
      data.verified = true;
      data.emailVerifiedAt = new Date();
    }

    await db.user.update({ where: { id }, data });

    await db.$transaction([
      db.moderationAction.create({
        data: {
          moderatorId: staff.id,
          targetUserId: target.id,
          targetType: "USER",
          targetId: target.id,
          action:
            input.action === "SUSPEND"
              ? "SUSPEND_USER"
              : input.action === "RESTORE"
                ? "RESTORE_USER"
                : "WARN",
          note: input.reason || input.action,
        },
      }),
      db.auditLog.create({
        data: {
          actorId: staff.id,
          action: `admin.user.${input.action.toLowerCase()}`,
          targetType: "USER",
          targetId: target.id,
          metadata: { reason: input.reason },
        },
      }),
    ]);

    const titles: Record<string, string> = {
      SUSPEND: "Your Everlink account has been suspended",
      RESTORE: "Your Everlink account has been restored",
      VERIFY: "Your Everlink account is now verified",
      MAKE_MODERATOR: "You are now a community moderator",
      MAKE_USER: "Your staff role was updated",
      MAKE_ADMIN: "You are now an Everlink administrator",
    };
    await createNotification({
      userId: target.id,
      type: "SECURITY",
      actorId: staff.id,
      title: titles[input.action] ?? "Your account was updated",
      body: input.reason || (data.suspendedReason ?? ""),
      link: data.status === "SUSPENDED" ? "/help" : "/home",
      entityType: "USER",
      entityId: target.id,
      dedupeKey: `admin-user:${target.id}:${input.action}:${Date.now()}`,
    });

    return json({ ok: true });
  });
}
