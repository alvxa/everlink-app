import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AdminSettingsForm } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin · Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const staff = await requireStaff();
  const rows = await db.siteSetting.findMany();
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const isAdmin = staff.role === "ADMIN";

  const env = {
    smtpConfigured: Boolean(process.env.SMTP_HOST),
    translationConfigured: Boolean(process.env.TRANSLATION_PROVIDER),
    redisConfigured: Boolean(process.env.REDIS_URL),
    pushConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    turnConfigured: Boolean(process.env.TURN_URLS || process.env.TURN_URL),
  };

  if (!isAdmin) {
    return (
      <div className="surface-card space-y-3 p-5">
        <Badge variant="outline">Read only</Badge>
        <h2 className="text-[14px] font-semibold text-ink">Administrator access required</h2>
        <p className="max-w-md text-[12.5px] leading-6 text-ink-muted">
          Site settings can only be changed by an administrator. The current values are managed centrally and every change is
          written to the audit log.
        </p>
        <dl className="max-w-md space-y-2 pt-1 text-[12.5px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Registration</dt>
            <dd className="font-semibold text-ink">{values.registrationOpen === "false" ? "Closed" : "Open"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <AdminSettingsForm
      settings={{
        registrationOpen: values.registrationOpen ?? "true",
      }}
      env={env}
    />
  );
}
