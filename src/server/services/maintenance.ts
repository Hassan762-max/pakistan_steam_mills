import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listEquipment(user: AuthUser, params: ListParams & { plantId?: string } = {}) {
  await requirePermission(user, P.MAINTENANCE_EQUIPMENT_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.plantId ? { plantId: params.plantId } : {}),
    ...(search
      ? { OR: [{ name: { contains: search } }, { assetTag: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.equipment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { assetTag: sortDir },
      include: { plant: true, _count: { select: { workOrders: true } } },
    }),
    db.equipment.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getEquipment(user: AuthUser, id: string) {
  await requirePermission(user, P.MAINTENANCE_EQUIPMENT_VIEW);
  const eq = await db.equipment.findUnique({
    where: { id },
    include: {
      plant: true,
      workOrders: { orderBy: { createdAt: "desc" } },
      schedules: true,
    },
  });
  if (!eq) throw new AuthError("VALIDATION", "Equipment not found");
  return eq;
}

export async function createEquipment(
  user: AuthUser,
  input: {
    assetTag: string;
    name: string;
    category?: string;
    plantId?: string;
    location?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    criticality?: string;
  },
) {
  await requirePermission(user, P.MAINTENANCE_EQUIPMENT_CREATE);
  const created = await db.equipment.create({
    data: { ...input, status: "operational", criticality: input.criticality ?? "medium" },
  });
  await auditMutation(user, {
    action: "create",
    module: "maintenance",
    resource: "equipment",
    resourceId: created.id,
  });
  return created;
}

export async function updateEquipment(
  user: AuthUser,
  id: string,
  input: Partial<{
    name: string;
    status: string;
    location: string | null;
    criticality: string;
    manufacturer: string | null;
    model: string | null;
  }>,
) {
  await requirePermission(user, P.MAINTENANCE_EQUIPMENT_EDIT);
  const updated = await db.equipment.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "maintenance",
    resource: "equipment",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listWorkOrders(user: AuthUser, params: ListParams & { equipmentId?: string } = {}) {
  await requirePermission(user, P.MAINTENANCE_WORK_ORDERS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.equipmentId ? { equipmentId: params.equipmentId } : {}),
    ...(search
      ? { OR: [{ workOrderNumber: { contains: search } }, { title: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.maintenanceWorkOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { equipment: true },
    }),
    db.maintenanceWorkOrder.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createWorkOrder(
  user: AuthUser,
  input: {
    workOrderNumber: string;
    equipmentId: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  },
) {
  await requirePermission(user, P.MAINTENANCE_WORK_ORDERS_CREATE);
  const created = await db.maintenanceWorkOrder.create({
    data: {
      ...input,
      type: input.type ?? "corrective",
      priority: input.priority ?? "medium",
      status: "open",
      requestedById: user.id,
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "maintenance",
    resource: "work_orders",
    resourceId: created.id,
  });
  return created;
}

export async function updateWorkOrder(
  user: AuthUser,
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignedTo: string | null;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    completedAt: Date | null;
    downtimeMinutes: number | null;
    sparePartsUsed: string | null;
  }>,
) {
  await requirePermission(user, P.MAINTENANCE_WORK_ORDERS_EDIT);
  const updated = await db.maintenanceWorkOrder.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "maintenance",
    resource: "work_orders",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function assignWorkOrder(user: AuthUser, id: string, assignedTo: string) {
  await requirePermission(user, P.MAINTENANCE_WORK_ORDERS_ASSIGN);
  const updated = await db.maintenanceWorkOrder.update({
    where: { id },
    data: { assignedTo, status: "assigned" },
  });
  await auditMutation(user, {
    action: "assign",
    module: "maintenance",
    resource: "work_orders",
    resourceId: id,
    afterValue: { assignedTo },
  });
  return updated;
}
