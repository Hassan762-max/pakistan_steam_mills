import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import { listIncidents, listSafetyInspections } from "@/server/services/safety";
import { SafetyClient } from "./safety-client";

export default async function SafetyPage() {
  const user = await requirePageUser();
  if (
    !hasPermission(user, P.SAFETY_INCIDENTS_VIEW) &&
    !hasPermission(user, P.SAFETY_INSPECTIONS_VIEW)
  ) {
    redirect("/dashboard");
  }

  const [incidents, inspections] = await Promise.all([
    hasPermission(user, P.SAFETY_INCIDENTS_VIEW)
      ? listIncidents(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.SAFETY_INSPECTIONS_VIEW)
      ? listSafetyInspections(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const openIncidents = incidents.items.filter((i) => i.status !== "closed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety"
        description="Incident reporting and workplace safety inspections."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Open incidents" value={formatNumber(openIncidents)} icon="HardHat" />
        <StatCard title="Total incidents" value={formatNumber(incidents.items.length)} />
        <StatCard title="Inspections" value={formatNumber(inspections.items.length)} />
      </div>
      <SafetyClient
        canReport={hasPermission(user, P.SAFETY_INCIDENTS_CREATE)}
        canCreateInspection={hasPermission(user, P.SAFETY_INSPECTIONS_CREATE)}
        incidents={incidents.items.map((i) => ({
          id: i.id,
          incidentNumber: i.incidentNumber,
          type: i.type,
          title: i.title,
          severity: i.severity,
          status: i.status,
          location: i.location,
          occurredAt: i.occurredAt.toISOString(),
          injuredCount: i.injuredCount,
        }))}
        inspections={inspections.items.map((s) => ({
          id: s.id,
          inspectionNo: s.inspectionNo,
          area: s.area,
          status: s.status,
          inspectorName: s.inspectorName,
          scheduledAt: s.scheduledAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
