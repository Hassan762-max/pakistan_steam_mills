import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import { listInspections, listNcrs } from "@/server/services/quality";
import { QualityClient } from "./quality-client";

export default async function QualityPage() {
  const user = await requirePageUser();
  if (
    !hasPermission(user, P.QUALITY_INSPECTIONS_VIEW) &&
    !hasPermission(user, P.QUALITY_NCRS_VIEW)
  ) {
    redirect("/dashboard");
  }

  const [inspections, ncrs] = await Promise.all([
    hasPermission(user, P.QUALITY_INSPECTIONS_VIEW)
      ? listInspections(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.QUALITY_NCRS_VIEW)
      ? listNcrs(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const openNcrs = ncrs.items.filter((n) => n.status === "open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality"
        description="Inspections, disposition decisions, and non-conformance tracking."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Inspections"
          value={formatNumber(inspections.items.length)}
          icon="BadgeCheck"
        />
        <StatCard title="Open NCRs" value={formatNumber(openNcrs)} />
        <StatCard title="Total NCRs" value={formatNumber(ncrs.items.length)} />
      </div>
      <QualityClient
        canCreateInspection={hasPermission(user, P.QUALITY_INSPECTIONS_CREATE)}
        canApproveInspection={hasPermission(user, P.QUALITY_INSPECTIONS_APPROVE)}
        canCreateNcr={hasPermission(user, P.QUALITY_NCRS_CREATE)}
        inspections={inspections.items.map((i) => ({
          id: i.id,
          inspectionNumber: i.inspectionNumber,
          type: i.type,
          productName: i.productName,
          batchNumber: i.batchNumber,
          status: i.status,
          inspectorName: i.inspectorName,
          ncrCount: i.ncrs.length,
          createdAt: i.createdAt.toISOString(),
        }))}
        ncrs={ncrs.items.map((n) => ({
          id: n.id,
          ncrNumber: n.ncrNumber,
          title: n.title,
          severity: n.severity,
          status: n.status,
          inspectionNumber: n.inspection?.inspectionNumber ?? null,
        }))}
      />
    </div>
  );
}
