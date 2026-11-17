import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getReportQueue } from "@/lib/queries";
import { ReportQueue } from "@/components/admin/admin-controls";
import { TabNav } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Admin · Reports" };
export const dynamic = "force-dynamic";

type Search = { status?: string };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  REVIEWING: "Reviewing",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff();
  const { status = "" } = await searchParams;
  const normalized = ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"].includes(status) ? status : "";

  const [reports, counts] = await Promise.all([
    getReportQueue(normalized || undefined),
    db.report.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countMap = Object.fromEntries(counts.map((row) => [row.status, row._count._all])) as Record<string, number>;
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const tabs = [
    { label: "All", href: "/admin/reports", count: total },
    { label: "Pending", href: "/admin/reports?status=PENDING", count: countMap.PENDING ?? 0 },
    { label: "Reviewing", href: "/admin/reports?status=REVIEWING", count: countMap.REVIEWING ?? 0 },
    { label: "Resolved", href: "/admin/reports?status=RESOLVED", count: countMap.RESOLVED ?? 0 },
    { label: "Dismissed", href: "/admin/reports?status=DISMISSED", count: countMap.DISMISSED ?? 0 },
  ];
  const active = normalized ? STATUS_LABELS[normalized] ?? "All" : "All";

  return (
    <div className="space-y-4">
      <div className="surface-card p-1.5">
        <TabNav items={tabs} active={active} />
      </div>
      <p className="px-1 text-[11.5px] text-ink-faint">
        Resolving or dismissing a report always writes a moderation record and notifies the reporter.
      </p>
      <ReportQueue reports={reports} />
    </div>
  );
}
