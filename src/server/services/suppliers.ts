import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listSuppliers(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.SUPPLIERS_SUPPLIERS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { city: { contains: search } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.supplier.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: sortDir },
      include: { _count: { select: { purchaseOrders: true, contracts: true } } },
    }),
    db.supplier.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getSupplier(user: AuthUser, id: string) {
  await requirePermission(user, P.SUPPLIERS_SUPPLIERS_VIEW);
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      contracts: true,
      performance: { orderBy: { createdAt: "desc" } },
      purchaseOrders: { take: 20, orderBy: { createdAt: "desc" } },
      documents: { take: 20 },
    },
  });
  if (!supplier) throw new AuthError("VALIDATION", "Supplier not found");
  return supplier;
}

export async function createSupplier(
  user: AuthUser,
  input: {
    code: string;
    name: string;
    legalName?: string;
    category?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    taxId?: string;
  },
) {
  await requirePermission(user, P.SUPPLIERS_SUPPLIERS_CREATE);
  const created = await db.supplier.create({ data: { ...input, status: "active" } });
  await auditMutation(user, {
    action: "create",
    module: "suppliers",
    resource: "suppliers",
    resourceId: created.id,
    afterValue: { code: created.code, name: created.name },
  });
  return created;
}

export async function updateSupplier(
  user: AuthUser,
  id: string,
  input: Partial<{
    name: string;
    legalName: string | null;
    category: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    rating: number | null;
    complianceNotes: string | null;
    status: string;
  }>,
) {
  await requirePermission(user, P.SUPPLIERS_SUPPLIERS_EDIT);
  const updated = await db.supplier.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "suppliers",
    resource: "suppliers",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function deleteSupplier(user: AuthUser, id: string) {
  await requirePermission(user, P.SUPPLIERS_SUPPLIERS_DELETE);
  const poCount = await db.purchaseOrder.count({ where: { supplierId: id } });
  if (poCount > 0) {
    throw new AuthError("VALIDATION", "Cannot delete supplier with existing purchase orders; deactivate instead");
  }
  await db.supplier.delete({ where: { id } });
  await auditMutation(user, {
    action: "delete",
    module: "suppliers",
    resource: "suppliers",
    resourceId: id,
  });
  return { ok: true as const };
}
