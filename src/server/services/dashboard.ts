import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { requirePermission, hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";

export async function getDashboardKpis(user: AuthUser) {
  await requirePermission(user, P.DASHBOARD_DASHBOARD_VIEW);

  const kpis: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    roles: user.roles.map((r) => r.code),
  };

  if (hasPermission(user, P.HR_EMPLOYEES_VIEW)) {
    const [totalEmployees, activeEmployees, onLeave] = await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { employmentStatus: "active" } }),
      db.leaveRequest.count({ where: { status: "approved", startDate: { lte: new Date() }, endDate: { gte: new Date() } } }),
    ]);
    kpis.hr = { totalEmployees, activeEmployees, onLeave };
  }

  if (hasPermission(user, P.PRODUCTION_ORDERS_VIEW)) {
    const [openOrders, inProgress, completedMonth] = await Promise.all([
      db.productionOrder.count({ where: { status: { in: ["planned", "scheduled", "in_progress"] } } }),
      db.productionOrder.count({ where: { status: "in_progress" } }),
      db.productionOrder.count({
        where: {
          status: "completed",
          actualEnd: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);
    const agg = await db.productionOrder.aggregate({
      where: { status: "in_progress" },
      _avg: { efficiency: true },
      _sum: { targetQuantity: true, actualQuantity: true },
    });
    kpis.production = {
      openOrders,
      inProgress,
      completedMonth,
      avgEfficiency: agg._avg.efficiency,
      targetQty: agg._sum.targetQuantity,
      actualQty: agg._sum.actualQuantity,
    };
  }

  if (hasPermission(user, P.INVENTORY_STOCK_VIEW)) {
    const items = await db.inventoryItem.findMany({
      where: { status: "active" },
      include: { stock: true },
    });
    const lowStock = items.filter((item) => {
      const qty = item.stock.reduce((s, sl) => s + sl.quantity, 0);
      return qty < item.reorderLevel;
    });
    kpis.inventory = {
      totalItems: items.length,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 10).map((i) => ({
        id: i.id,
        itemCode: i.itemCode,
        name: i.name,
        reorderLevel: i.reorderLevel,
        quantity: i.stock.reduce((s, sl) => s + sl.quantity, 0),
      })),
    };
  }

  if (hasPermission(user, P.PROCUREMENT_REQUESTS_VIEW) || hasPermission(user, P.PROCUREMENT_ORDERS_VIEW)) {
    const [pendingRequests, openPos] = await Promise.all([
      db.purchaseRequest.count({ where: { status: { in: ["submitted", "draft"] } } }),
      db.purchaseOrder.count({ where: { status: { in: ["draft", "issued", "partial"] } } }),
    ]);
    kpis.procurement = { pendingRequests, openPos };
  }

  if (hasPermission(user, P.MAINTENANCE_WORK_ORDERS_VIEW)) {
    const [openWo, inProgressWo, criticalEquipment] = await Promise.all([
      db.maintenanceWorkOrder.count({ where: { status: { in: ["open", "assigned"] } } }),
      db.maintenanceWorkOrder.count({ where: { status: "in_progress" } }),
      db.equipment.count({ where: { status: { in: ["under_maintenance", "breakdown"] } } }),
    ]);
    kpis.maintenance = { openWo, inProgressWo, criticalEquipment };
  }

  if (hasPermission(user, P.QUALITY_NCRS_VIEW) || hasPermission(user, P.QUALITY_INSPECTIONS_VIEW)) {
    const [openNcrs, pendingInspections] = await Promise.all([
      db.nonConformanceReport.count({ where: { status: { not: "closed" } } }),
      db.qualityInspection.count({ where: { status: { in: ["pending", "in_progress"] } } }),
    ]);
    kpis.quality = { openNcrs, pendingInspections };
  }

  if (hasPermission(user, P.SAFETY_INCIDENTS_VIEW)) {
    const [openIncidents, nearMisses] = await Promise.all([
      db.safetyIncident.count({ where: { status: { not: "closed" } } }),
      db.safetyIncident.count({ where: { type: "near_miss" } }),
    ]);
    kpis.safety = { openIncidents, nearMisses };
  }

  if (hasPermission(user, P.FINANCE_BUDGETS_VIEW)) {
    const budgets = await db.budget.findMany({
      where: { fiscalYear: new Date().getFullYear(), status: "active" },
    });
    kpis.finance = {
      allocated: budgets.reduce((s, b) => s + b.allocated, 0),
      spent: budgets.reduce((s, b) => s + b.spent, 0),
      committed: budgets.reduce((s, b) => s + b.committed, 0),
    };
  }

  if (hasPermission(user, P.WORKFLOWS_WORKFLOWS_VIEW) || hasPermission(user, P.WORKFLOWS_WORKFLOWS_APPROVE)) {
    kpis.workflows = {
      pending: await db.workflowInstance.count({
        where: { status: { in: ["pending", "in_progress"] } },
      }),
    };
  }

  const unreadNotifications = await db.notification.count({
    where: { userId: user.id, isRead: false },
  });
  kpis.notifications = { unread: unreadNotifications };

  return kpis;
}
