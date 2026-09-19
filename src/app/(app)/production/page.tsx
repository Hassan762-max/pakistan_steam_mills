import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import {
  listProductionLines,
  listProductionOrders,
  listProductionSchedules,
} from "@/server/services/production";
import { ProductionClient } from "./production-client";

export default async function ProductionPage() {
  const user = await requirePageUser();
  if (
    !hasPermission(user, P.PRODUCTION_ORDERS_VIEW) &&
    !hasPermission(user, P.PRODUCTION_LINES_VIEW)
  ) {
    redirect("/dashboard");
  }

  const [ordersResult, lines, schedulesResult] = await Promise.all([
    hasPermission(user, P.PRODUCTION_ORDERS_VIEW)
      ? listProductionOrders(user, { pageSize: 100 })
      : Promise.resolve({ items: [], total: 0 }),
    hasPermission(user, P.PRODUCTION_LINES_VIEW)
      ? listProductionLines(user)
      : Promise.resolve([]),
    hasPermission(user, P.PRODUCTION_SCHEDULES_VIEW)
      ? listProductionSchedules(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const orders = ordersResult.items;
  const targetTotal = orders.reduce((s, o) => s + o.targetQuantity, 0);
  const actualTotal = orders.reduce((s, o) => s + o.actualQuantity, 0);
  const withEff = orders.filter((o) => o.efficiency != null);
  const avgEff =
    withEff.reduce((s, o) => s + (o.efficiency ?? 0), 0) / Math.max(1, withEff.length);
  const attainment = targetTotal > 0 ? (actualTotal / targetTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production"
        description="Plan and track mill orders, line utilization, and shift schedules."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Target output"
          value={`${formatNumber(targetTotal, 1)} MT`}
          description="Across listed orders"
          icon="Target"
        />
        <StatCard
          title="Actual output"
          value={`${formatNumber(actualTotal, 1)} MT`}
          description={`${formatNumber(attainment, 1)}% of target`}
          icon="Factory"
        />
        <StatCard
          title="Avg efficiency"
          value={`${formatNumber(avgEff, 1)}%`}
          description={`${withEff.length} measured orders`}
          icon="Gauge"
        />
        <StatCard
          title="Active lines"
          value={formatNumber(lines.filter((l) => l.status === "operational").length)}
          description={`${lines.length} total lines`}
          icon="TrendingUp"
        />
      </div>

      <ProductionClient
        permissions={{
          canCreate: hasPermission(user, P.PRODUCTION_ORDERS_CREATE),
          canEdit: hasPermission(user, P.PRODUCTION_ORDERS_EDIT),
        }}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          productCode: o.productCode,
          productName: o.productName,
          status: o.status,
          priority: o.priority,
          targetQuantity: o.targetQuantity,
          actualQuantity: o.actualQuantity,
          unit: o.unit,
          efficiency: o.efficiency,
          lineName: o.productionLine?.name ?? null,
          plannedStart: o.plannedStart?.toISOString() ?? null,
          plannedEnd: o.plannedEnd?.toISOString() ?? null,
          notes: o.notes,
          productionLineId: o.productionLineId,
        }))}
        lines={lines.map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          status: l.status,
          plantName: l.plant?.name ?? null,
          orderCount: l._count.orders,
          capacity: l.capacity,
        }))}
        schedules={schedulesResult.items.map((s) => ({
          id: s.id,
          orderNumber: s.order.orderNumber,
          productName: s.order.productName,
          lineName: s.line.name,
          scheduledDate: s.scheduledDate.toISOString(),
          targetQuantity: s.targetQuantity,
          status: s.status,
        }))}
      />
    </div>
  );
}
