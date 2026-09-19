import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listPurchaseRequests(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.PROCUREMENT_REQUESTS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(search
      ? { OR: [{ requestNumber: { contains: search } }, { title: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.purchaseRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { items: true },
    }),
    db.purchaseRequest.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getPurchaseRequest(user: AuthUser, id: string) {
  await requirePermission(user, P.PROCUREMENT_REQUESTS_VIEW);
  const pr = await db.purchaseRequest.findUnique({
    where: { id },
    include: { items: true, rfqs: true },
  });
  if (!pr) throw new AuthError("VALIDATION", "Purchase request not found");
  return pr;
}

export async function createPurchaseRequest(
  user: AuthUser,
  input: {
    requestNumber: string;
    title: string;
    departmentId?: string;
    priority?: string;
    justification?: string;
    requiredDate?: Date;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      inventoryItemId?: string;
      estimatedUnitCost?: number;
    }>;
  },
) {
  await requirePermission(user, P.PROCUREMENT_REQUESTS_CREATE);
  const totalEstimate = input.items.reduce(
    (s, i) => s + (i.estimatedUnitCost ?? 0) * i.quantity,
    0,
  );
  const created = await db.purchaseRequest.create({
    data: {
      requestNumber: input.requestNumber,
      title: input.title,
      departmentId: input.departmentId,
      requestedById: user.id,
      priority: input.priority ?? "normal",
      status: "draft",
      justification: input.justification,
      requiredDate: input.requiredDate,
      totalEstimate,
      items: { create: input.items },
    },
    include: { items: true },
  });
  await auditMutation(user, {
    action: "create",
    module: "procurement",
    resource: "requests",
    resourceId: created.id,
  });
  return created;
}

export async function setPurchaseRequestStatus(
  user: AuthUser,
  id: string,
  status: "submitted" | "approved" | "rejected" | "converted",
) {
  if (status === "approved") await requirePermission(user, P.PROCUREMENT_REQUESTS_APPROVE);
  else if (status === "rejected") await requirePermission(user, P.PROCUREMENT_REQUESTS_REJECT);
  else await requirePermission(user, P.PROCUREMENT_REQUESTS_CREATE);

  const updated = await db.purchaseRequest.update({ where: { id }, data: { status } });
  await auditMutation(user, {
    action: status,
    module: "procurement",
    resource: "requests",
    resourceId: id,
  });
  return updated;
}

export async function listPurchaseOrders(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.PROCUREMENT_ORDERS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(search
      ? { OR: [{ poNumber: { contains: search } }, { title: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { supplier: true, items: true },
    }),
    db.purchaseOrder.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getPurchaseOrder(user: AuthUser, id: string) {
  await requirePermission(user, P.PROCUREMENT_ORDERS_VIEW);
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { item: true } }, goodsReceipts: true, invoices: true },
  });
  if (!po) throw new AuthError("VALIDATION", "Purchase order not found");
  return po;
}

export async function createPurchaseOrder(
  user: AuthUser,
  input: {
    poNumber: string;
    supplierId: string;
    title: string;
    expectedDate?: Date;
    notes?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      inventoryItemId?: string;
    }>;
  },
) {
  await requirePermission(user, P.PROCUREMENT_ORDERS_CREATE);
  const totalAmount = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const created = await db.purchaseOrder.create({
    data: {
      poNumber: input.poNumber,
      supplierId: input.supplierId,
      title: input.title,
      expectedDate: input.expectedDate,
      notes: input.notes,
      totalAmount,
      status: "draft",
      createdById: user.id,
      items: { create: input.items },
    },
    include: { items: true, supplier: true },
  });
  await auditMutation(user, {
    action: "create",
    module: "procurement",
    resource: "orders",
    resourceId: created.id,
  });
  return created;
}

export async function updatePurchaseOrder(
  user: AuthUser,
  id: string,
  input: Partial<{ status: string; notes: string | null; expectedDate: Date | null }>,
) {
  if (input.status === "issued" || input.status === "closed") {
    await requirePermission(user, P.PROCUREMENT_ORDERS_APPROVE);
  } else {
    await requirePermission(user, P.PROCUREMENT_ORDERS_EDIT);
  }
  const updated = await db.purchaseOrder.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "procurement",
    resource: "orders",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listRfqs(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.PROCUREMENT_RFQS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? { OR: [{ rfqNumber: { contains: params.search } }, { title: { contains: params.search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.rFQ.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, quotations: true, purchaseRequest: true },
    }),
    db.rFQ.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createRfq(
  user: AuthUser,
  input: {
    rfqNumber: string;
    title: string;
    purchaseRequestId?: string;
    supplierId?: string;
    dueDate?: Date;
  },
) {
  await requirePermission(user, P.PROCUREMENT_RFQS_CREATE);
  const created = await db.rFQ.create({ data: { ...input, status: "open" } });
  await auditMutation(user, {
    action: "create",
    module: "procurement",
    resource: "rfqs",
    resourceId: created.id,
  });
  return created;
}

export async function createGoodsReceipt(
  user: AuthUser,
  input: {
    grnNumber: string;
    purchaseOrderId: string;
    notes?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      inventoryItemId?: string;
      batchNumber?: string;
    }>;
  },
) {
  await requirePermission(user, P.PROCUREMENT_RECEIPTS_CREATE);
  const created = await db.goodsReceipt.create({
    data: {
      grnNumber: input.grnNumber,
      purchaseOrderId: input.purchaseOrderId,
      notes: input.notes,
      receivedById: user.id,
      status: "received",
      items: { create: input.items },
    },
    include: { items: true },
  });
  await auditMutation(user, {
    action: "create",
    module: "procurement",
    resource: "receipts",
    resourceId: created.id,
  });
  return created;
}

export async function listGoodsReceipts(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.PROCUREMENT_RECEIPTS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const [items, total] = await Promise.all([
    db.goodsReceipt.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { purchaseOrder: true, items: true },
    }),
    db.goodsReceipt.count(),
  ]);
  return paginate(items, total, page, pageSize);
}
