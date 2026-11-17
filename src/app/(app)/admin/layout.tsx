import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-brand">
            <ShieldCheck className="h-3.5 w-3.5" /> Staff area
          </p>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink">Admin dashboard</h1>
          <p className="text-[12.5px] text-ink-muted">
            Signed in as @{user.username} · {user.role === "ADMIN" ? "Administrator" : "Moderator"}
          </p>
        </div>
        <Link href="/home" className="text-[12.5px] font-semibold text-ink-muted transition hover:text-brand">
          Back to Everlink
        </Link>
      </div>

      <AdminNav />

      <div className="mt-4">{children}</div>
    </div>
  );
}
