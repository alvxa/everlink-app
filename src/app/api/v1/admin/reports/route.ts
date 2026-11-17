import { db } from "@/lib/db";
import { json, withApi } from "@/lib/api";
import { requireStaffApi } from "@/lib/api-session";
import { getReportQueue } from "@/lib/queries";

export async function GET(req: Request) {
  return withApi(async () => {
    await requireStaffApi();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const reports = await getReportQueue(status ?? undefined);
    const counts = await db.report.groupBy({ by: ["status"], _count: { _all: true } });
    return json({
      reports,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    });
  });
}
