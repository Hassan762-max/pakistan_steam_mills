import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import { listEquipment, listWorkOrders } from "@/server/services/maintenance";
import { MaintenanceClient } from "./maintenance-client";

export default async function MaintenancePage() {
  const user = await requirePageUser();
  if (
    !hasPermission(user, P.MAINTENANCE_EQUIPMENT_VIEW) &&
    !hasPermission(user, P.MAINTENANCE_WORK_ORDERS_VIEW)
  ) {
    redirect("/dashboard");
  }

  const [equipment, workOrders] = await Promise.all([
    hasPermission(user, P.MAINTENANCE_EQUIPMENT_VIEW)
      ? listEquipment(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.MAINTENANCE_WORK_ORDERS_VIEW)
      ? listWorkOrders(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const openWo = workOrders.items.filter((w) =>
    ["open", "assigned", "in_progress"].includes(w.status),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Equipment registry and work order execution for plant reliability."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Assets" value={formatNumber(equipment.items.length)} icon="Wrench" />
        <StatCard title="Open work orders" value={formatNumber(openWo)} />
        <StatCard title="Total work orders" value={formatNumber(workOrders.items.length)} />
      </div>
      <MaintenanceClient
        canCreateWo={hasPermission(user, P.MAINTENANCE_WORK_ORDERS_CREATE)}
        equipment={equipment.items.map((e) => ({
          id: e.id,
          assetTag: e.assetTag,
          name: e.name,
          status: e.status,
          criticality: e.criticality,
          plantName: e.plant?.name ?? null,
          location: e.location,
          workOrderCount: e._count.workOrders,
        }))}
        workOrders={workOrders.items.map((w) => ({
          id: w.id,
          workOrderNumber: w.workOrderNumber,
          title: w.title,
          status: w.status,
          priority: w.priority,
          type: w.type,
          equipmentName: w.equipment.name,
          equipmentId: w.equipmentId,
          scheduledStart: w.scheduledStart?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
