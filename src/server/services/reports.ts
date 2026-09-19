import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { requirePermission, hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";

export async function getEmployeeReport(user: AuthUser) {
  await requirePermission(user, P.REPORTS_EMPLOYEE_VIEW);
  const byDept = await db.employee.groupBy({
    by: ["departmentId"],
    _count: { id: true },
  });
  const byStatus = await db.employee.groupBy({
    by: ["employmentStatus"],
    _count: { id: true },
  });
  const departments = await db.department.findMany({
    select: { id: true, name: true, code: true },
  });
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  return {
    byDepartment: byDept.map((r) => ({
      department: r.departmentId ? deptMap.get(r.departmentId) : null,
      count: r._count.id,
    })),
    byStatus: byStatus.map((r) => ({ status: r.employmentStatus, count: r._count.id })),
    total: await db.employee.count(),
  };
}

export async function getProductionReport(user: AuthUser, from?: Date, to?: Date) {
  await requirePermission(user, P.REPORTS_PRODUCTION_VIEW);
  const where = {
    ...(from || to
      ? {
          plannedStart: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const orders = await db.productionOrder.findMany({ where });
  const byStatus = await db.productionOrder.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
    _sum: { targetQuantity: true, actualQuantity: true },
  });
  return {
    orderCount: orders.length,
    byStatus,
    avgEfficiency:
      orders.filter((o) => o.efficiency != null).reduce((s, o) => s + (o.efficiency ?? 0), 0) /
      Math.max(1, orders.filter((o) => o.efficiency != null).length),
  };
}

export async function getInventoryReport(user: AuthUser) {
  await requirePermission(user, P.REPORTS_INVENTORY_VIEW);
  const items = await db.inventoryItem.findMany({
    where: { status: "active" },
    include: { stock: true },
  });
  const lowStock = items.filter((i) => {
    const qty = i.stock.reduce((s, sl) => s + sl.quantity, 0);
    return qty < i.reorderLevel;
  });
  const byCategory = new Map<string, number>();
  for (const i of items) {
    byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
  }
  return {
    totalItems: items.length,
    lowStockCount: lowStock.length,
    lowStock: lowStock.map((i) => ({
      itemCode: i.itemCode,
      name: i.name,
      quantity: i.stock.reduce((s, sl) => s + sl.quantity, 0),
      reorderLevel: i.reorderLevel,
    })),
    byCategory: Array.from(byCategory.entries()).map(([category, count]) => ({ category, count })),
  };
}

export async function getProcurementReport(user: AuthUser) {
  await requirePermission(user, P.REPORTS_PROCUREMENT_VIEW);
  const [requests, orders, spend] = await Promise.all([
    db.purchaseRequest.groupBy({ by: ["status"], _count: { id: true } }),
    db.purchaseOrder.groupBy({ by: ["status"], _count: { id: true }, _sum: { totalAmount: true } }),
    db.purchaseOrder.aggregate({ _sum: { totalAmount: true } }),
  ]);
  return { requests, orders, totalSpend: spend._sum.totalAmount ?? 0 };
}

export async function getMaintenanceReport(user: AuthUser) {
  await requirePermission(user, P.REPORTS_MAINTENANCE_VIEW);
  const [workOrders, equipment] = await Promise.all([
    db.maintenanceWorkOrder.groupBy({ by: ["status"], _count: { id: true } }),
    db.equipment.groupBy({ by: ["status"], _count: { id: true } }),
  ]);
  return { workOrders, equipment };
}

export async function getQualityReport(user: AuthUser) {
  await requirePermission(user, P.REPORTS_QUALITY_VIEW);
  const [inspections, ncrs] = await Promise.all([
    db.qualityInspection.groupBy({ by: ["status"], _count: { id: true } }),
    db.nonConformanceReport.groupBy({ by: ["status"], _count: { id: true } }),
  ]);
  return { inspections, ncrs };
}

export async function getSafetyReport(user: AuthUser) {
  await requirePermission(user, P.REPORTS_SAFETY_VIEW);
  const [byType, byStatus] = await Promise.all([
    db.safetyIncident.groupBy({ by: ["type"], _count: { id: true } }),
    db.safetyIncident.groupBy({ by: ["status"], _count: { id: true } }),
  ]);
  return { byType, byStatus };
}

export async function getAttendanceReport(user: AuthUser, from?: Date, to?: Date) {
  await requirePermission(user, P.REPORTS_ATTENDANCE_VIEW);
  const where = {
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const byStatus = await db.attendanceRecord.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
    _sum: { lateMinutes: true, overtimeMinutes: true },
  });
  return { byStatus };
}

export async function getAuditReport(user: AuthUser, from?: Date, to?: Date) {
  await requirePermission(user, P.REPORTS_AUDIT_VIEW);
  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const [byModule, byAction] = await Promise.all([
    db.auditLog.groupBy({ by: ["module"], where, _count: { id: true } }),
    db.auditLog.groupBy({ by: ["action"], where, _count: { id: true } }),
  ]);
  return { byModule, byAction };
}

export async function getAvailableReports(user: AuthUser) {
  const reports = [
    { key: "employee", permission: P.REPORTS_EMPLOYEE_VIEW, label: "Employee Report" },
    { key: "production", permission: P.REPORTS_PRODUCTION_VIEW, label: "Production Report" },
    { key: "inventory", permission: P.REPORTS_INVENTORY_VIEW, label: "Inventory Report" },
    { key: "procurement", permission: P.REPORTS_PROCUREMENT_VIEW, label: "Procurement Report" },
    { key: "maintenance", permission: P.REPORTS_MAINTENANCE_VIEW, label: "Maintenance Report" },
    { key: "quality", permission: P.REPORTS_QUALITY_VIEW, label: "Quality Report" },
    { key: "safety", permission: P.REPORTS_SAFETY_VIEW, label: "Safety Report" },
    { key: "attendance", permission: P.REPORTS_ATTENDANCE_VIEW, label: "Attendance Report" },
    { key: "audit", permission: P.REPORTS_AUDIT_VIEW, label: "Audit Report" },
  ];
  return reports.filter((r) => hasPermission(user, r.permission));
}
