import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { P } from "@/lib/permissions";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import {
  getAttendanceReport,
  getAuditReport,
  getAvailableReports,
  getEmployeeReport,
  getInventoryReport,
  getMaintenanceReport,
  getProcurementReport,
  getProductionReport,
  getQualityReport,
  getSafetyReport,
} from "@/server/services/reports";
import { ReportViewClient } from "../report-view-client";

const EXPORT_PERMS: Record<string, string | undefined> = {
  employee: P.REPORTS_EMPLOYEE_EXPORT,
  production: P.REPORTS_PRODUCTION_EXPORT,
  inventory: P.REPORTS_INVENTORY_EXPORT,
  procurement: P.REPORTS_PROCUREMENT_EXPORT,
  audit: P.REPORTS_AUDIT_EXPORT,
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const user = await requirePageUser();
  const { category } = await params;
  const available = await getAvailableReports(user);
  const meta = available.find((r) => r.key === category);
  if (!meta) notFound();

  let data: Record<string, unknown>;
  switch (category) {
    case "employee":
      data = await getEmployeeReport(user);
      break;
    case "production":
      data = await getProductionReport(user);
      break;
    case "inventory":
      data = await getInventoryReport(user);
      break;
    case "procurement":
      data = await getProcurementReport(user);
      break;
    case "maintenance":
      data = await getMaintenanceReport(user);
      break;
    case "quality":
      data = await getQualityReport(user);
      break;
    case "safety":
      data = await getSafetyReport(user);
      break;
    case "attendance":
      data = await getAttendanceReport(user);
      break;
    case "audit":
      data = await getAuditReport(user);
      break;
    default:
      notFound();
  }

  const exportPerm = EXPORT_PERMS[category];
  const canExport = exportPerm ? hasPermission(user, exportPerm) : true;

  // Serialize for client (Dates / BigInt not expected in these aggregates)
  const serialized = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.label}
        description="Live data from the reporting service. Export CSV when permitted."
        breadcrumbs={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/reports">Reports</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{meta.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <ReportViewClient
        reportKey={category}
        label={meta.label}
        canExport={canExport}
        data={serialized}
      />
    </div>
  );
}
