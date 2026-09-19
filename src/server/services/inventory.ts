import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listInventoryItems(user: AuthUser, params: ListParams & { category?: string; lowStockOnly?: boolean } = {}) {
  await requirePermission(user, P.INVENTORY_STOCK_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();

  const where = {
    ...(params.status ? { status: params.status } : { status: "active" }),
    ...(params.category ? { category: params.category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { itemCode: { contains: search } },
            { sku: { contains: search } },
          ],
        }
      : {}),
  };

  let items = await db.inventoryItem.findMany({
    where,
    orderBy: { name: sortDir },
    include: { stock: { include: { warehouse: true } } },
  });

  if (params.lowStockOnly) {
    items = items.filter((i) => {
      const qty = i.stock.reduce((s, sl) => s + sl.quantity, 0);
      return qty < i.reorderLevel;
    });
  }

  const total = items.length;
  const pageItems = items.slice(skip, skip + pageSize);
  return paginate(pageItems, total, page, pageSize);
}

export async function getInventoryItem(user: AuthUser, id: string) {
  await requirePermission(user, P.INVENTORY_STOCK_VIEW);
  const item = await db.inventoryItem.findUnique({
    where: { id },
    include: {
      stock: { include: { warehouse: true, location: true } },
      movements: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!item) throw new AuthError("VALIDATION", "Inventory item not found");
  return item;
}

export async function createInventoryItem(
  user: AuthUser,
  input: {
    itemCode: string;
    name: string;
    category: string;
    unit?: string;
    reorderLevel?: number;
    reorderQty?: number;
    unitCost?: number;
    sku?: string;
    description?: string;
  },
) {
  await requirePermission(user, P.INVENTORY_STOCK_CREATE);
  const created = await db.inventoryItem.create({
    data: {
      ...input,
      unit: input.unit ?? "MT",
      reorderLevel: input.reorderLevel ?? 0,
      reorderQty: input.reorderQty ?? 0,
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "inventory",
    resource: "stock",
    resourceId: created.id,
    afterValue: { itemCode: created.itemCode },
  });
  return created;
}

export async function adjustStock(
  user: AuthUser,
  input: {
    inventoryItemId: string;
    warehouseId: string;
    quantityDelta: number;
    type?: "adjustment" | "receipt" | "issue";
    notes?: string;
    batchNumber?: string;
    locationId?: string;
  },
) {
  await requirePermission(user, P.INVENTORY_STOCK_EDIT);

  const item = await db.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
  if (!item) throw new AuthError("VALIDATION", "Item not found");

  const existing = await db.stockLevel.findFirst({
    where: {
      inventoryItemId: input.inventoryItemId,
      warehouseId: input.warehouseId,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.batchNumber ? { batchNumber: input.batchNumber } : {}),
    },
  });

  const type = input.type ?? "adjustment";
  const absQty = Math.abs(input.quantityDelta);

  const result = await db.$transaction(async (tx) => {
    let stock;
    if (existing) {
      const nextQty = existing.quantity + input.quantityDelta;
      if (nextQty < 0) throw new AuthError("VALIDATION", "Insufficient stock for this adjustment");
      stock = await tx.stockLevel.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      if (input.quantityDelta < 0) throw new AuthError("VALIDATION", "Cannot issue from non-existent stock");
      stock = await tx.stockLevel.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          warehouseId: input.warehouseId,
          locationId: input.locationId,
          quantity: input.quantityDelta,
          batchNumber: input.batchNumber,
        },
      });
    }

    const movement = await tx.stockMovement.create({
      data: {
        inventoryItemId: input.inventoryItemId,
        warehouseId: input.warehouseId,
        type,
        quantity: absQty,
        notes: input.notes,
        batchNumber: input.batchNumber,
        performedById: user.id,
      },
    });

    return { stock, movement };
  });

  await auditMutation(user, {
    action: "adjust_stock",
    module: "inventory",
    resource: "stock",
    resourceId: input.inventoryItemId,
    afterValue: { delta: input.quantityDelta, type },
  });

  return result;
}

export async function listWarehouses(user: AuthUser) {
  await requirePermission(user, P.INVENTORY_WAREHOUSES_VIEW);
  return db.warehouse.findMany({
    include: { plant: true, _count: { select: { stock: true } } },
    orderBy: { code: "asc" },
  });
}

export async function createWarehouse(
  user: AuthUser,
  input: { code: string; name: string; type?: string; plantId?: string; location?: string },
) {
  await requirePermission(user, P.INVENTORY_WAREHOUSES_CREATE);
  const created = await db.warehouse.create({ data: { ...input, type: input.type ?? "general" } });
  await auditMutation(user, {
    action: "create",
    module: "inventory",
    resource: "warehouses",
    resourceId: created.id,
  });
  return created;
}

export async function listStockMovements(user: AuthUser, params: ListParams & { itemId?: string; warehouseId?: string } = {}) {
  await requirePermission(user, P.INVENTORY_MOVEMENTS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.itemId ? { inventoryItemId: params.itemId } : {}),
    ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
    ...(params.status ? { type: params.status } : {}),
  };
  const [items, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { item: true, warehouse: true },
    }),
    db.stockMovement.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createStockMovement(
  user: AuthUser,
  input: {
    inventoryItemId: string;
    warehouseId: string;
    type: string;
    quantity: number;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    notes?: string;
    batchNumber?: string;
  },
) {
  await requirePermission(user, P.INVENTORY_MOVEMENTS_CREATE);

  if (input.type === "transfer" && input.toWarehouseId) {
    await adjustStock(user, {
      inventoryItemId: input.inventoryItemId,
      warehouseId: input.warehouseId,
      quantityDelta: -input.quantity,
      type: "issue",
      notes: input.notes ?? "Transfer out",
      batchNumber: input.batchNumber,
    });
    return adjustStock(user, {
      inventoryItemId: input.inventoryItemId,
      warehouseId: input.toWarehouseId,
      quantityDelta: input.quantity,
      type: "receipt",
      notes: input.notes ?? "Transfer in",
      batchNumber: input.batchNumber,
    });
  }

  const delta = input.type === "issue" ? -input.quantity : input.quantity;
  return adjustStock(user, {
    inventoryItemId: input.inventoryItemId,
    warehouseId: input.warehouseId,
    quantityDelta: delta,
    type: input.type as "adjustment" | "receipt" | "issue",
    notes: input.notes,
    batchNumber: input.batchNumber,
  });
}
