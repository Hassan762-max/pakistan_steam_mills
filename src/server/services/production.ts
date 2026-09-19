import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listProductionOrders(user: AuthUser, params: ListParams & { plantId?: string; lineId?: string } = {}) {
  await requirePermission(user, P.PRODUCTION_ORDERS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();

  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.plantId ? { plantId: params.plantId } : {}),
    ...(params.lineId ? { productionLineId: params.lineId } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search } },
            { productName: { contains: search } },
            { productCode: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.productionOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { productionLine: true },
    }),
    db.productionOrder.count({ where }),
  ]);

  return paginate(items, total, page, pageSize);
}

export async function getProductionOrder(user: AuthUser, id: string) {
  await requirePermission(user, P.PRODUCTION_ORDERS_VIEW);
  const order = await db.productionOrder.findUnique({
    where: { id },
    include: {
      productionLine: true,
      schedules: true,
      consumptions: { include: { item: true } },
    },
  });
  if (!order) throw new AuthError("VALIDATION", "Production order not found");
  return order;
}

export async function createProductionOrder(
  user: AuthUser,
  input: {
    orderNumber: string;
    productCode: string;
    productName: string;
    productionLineId?: string;
    plantId?: string;
    targetQuantity: number;
    unit?: string;
    priority?: string;
    plannedStart?: Date;
    plannedEnd?: Date;
    notes?: string;
  },
) {
  await requirePermission(user, P.PRODUCTION_ORDERS_CREATE);
  const created = await db.productionOrder.create({
    data: {
      ...input,
      unit: input.unit ?? "MT",
      priority: input.priority ?? "normal",
      status: "planned",
      createdById: user.id,
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "production",
    resource: "orders",
    resourceId: created.id,
    afterValue: { orderNumber: created.orderNumber },
  });
  return created;
}

export async function updateProductionOrder(
  user: AuthUser,
  id: string,
  input: Partial<{
    targetQuantity: number;
    actualQuantity: number;
    status: string;
    priority: string;
    plannedStart: Date | null;
    plannedEnd: Date | null;
    actualStart: Date | null;
    actualEnd: Date | null;
    efficiency: number | null;
    yieldPercent: number | null;
    notes: string | null;
    productionLineId: string | null;
  }>,
) {
  await requirePermission(user, P.PRODUCTION_ORDERS_EDIT);
  const before = await db.productionOrder.findUnique({ where: { id } });
  if (!before) throw new AuthError("VALIDATION", "Production order not found");

  const updated = await db.productionOrder.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "production",
    resource: "orders",
    resourceId: id,
    beforeValue: { status: before.status, actualQuantity: before.actualQuantity },
    afterValue: { status: updated.status, actualQuantity: updated.actualQuantity },
  });
  return updated;
}

export async function listProductionLines(user: AuthUser, plantId?: string) {
  await requirePermission(user, P.PRODUCTION_LINES_VIEW);
  return db.productionLine.findMany({
    where: {
      ...(plantId ? { plantId } : {}),
    },
    include: { plant: true, _count: { select: { orders: true } } },
    orderBy: { code: "asc" },
  });
}

export async function listProductionSchedules(user: AuthUser, params: ListParams & { lineId?: string } = {}) {
  await requirePermission(user, P.PRODUCTION_SCHEDULES_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.lineId ? { productionLineId: params.lineId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };
  const [items, total] = await Promise.all([
    db.productionSchedule.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { scheduledDate: "desc" },
      include: { order: true, line: true },
    }),
    db.productionSchedule.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createProductionSchedule(
  user: AuthUser,
  input: {
    productionOrderId: string;
    productionLineId: string;
    shiftId?: string;
    scheduledDate: Date;
    targetQuantity: number;
  },
) {
  await requirePermission(user, P.PRODUCTION_SCHEDULES_CREATE);
  const created = await db.productionSchedule.create({ data: { ...input, status: "scheduled" } });
  await auditMutation(user, {
    action: "create",
    module: "production",
    resource: "schedules",
    resourceId: created.id,
  });
  return created;
}
