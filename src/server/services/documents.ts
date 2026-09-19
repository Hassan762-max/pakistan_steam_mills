import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listDocuments(user: AuthUser, params: ListParams & { category?: string } = {}) {
  await requirePermission(user, P.DOCUMENTS_DOCUMENTS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    status: params.status ?? "active",
    ...(params.category ? { category: params.category } : {}),
    ...(search
      ? { OR: [{ title: { contains: search } }, { fileName: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.document.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.document.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getDocument(user: AuthUser, id: string) {
  await requirePermission(user, P.DOCUMENTS_DOCUMENTS_VIEW);
  const doc = await db.document.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      employee: true,
      supplier: true,
    },
  });
  if (!doc) throw new AuthError("VALIDATION", "Document not found");
  return doc;
}

export async function createDocument(
  user: AuthUser,
  input: {
    title: string;
    fileName: string;
    filePath: string;
    mimeType?: string;
    sizeBytes?: number;
    category: string;
    accessLevel?: string;
    employeeId?: string;
    supplierId?: string;
    expiresAt?: Date;
    checksum?: string;
  },
) {
  await requirePermission(user, P.DOCUMENTS_DOCUMENTS_CREATE);
  const created = await db.document.create({
    data: {
      ...input,
      accessLevel: input.accessLevel ?? "internal",
      uploadedById: user.id,
      status: "active",
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "documents",
    resource: "documents",
    resourceId: created.id,
    afterValue: { title: created.title, category: created.category },
  });
  return created;
}

export async function updateDocument(
  user: AuthUser,
  id: string,
  input: Partial<{
    title: string;
    category: string;
    accessLevel: string;
    status: string;
    expiresAt: Date | null;
  }>,
) {
  await requirePermission(user, P.DOCUMENTS_DOCUMENTS_EDIT);
  const updated = await db.document.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "documents",
    resource: "documents",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function deleteDocument(user: AuthUser, id: string) {
  await requirePermission(user, P.DOCUMENTS_DOCUMENTS_DELETE);
  const updated = await db.document.update({
    where: { id },
    data: { status: "archived" },
  });
  await auditMutation(user, {
    action: "archive",
    module: "documents",
    resource: "documents",
    resourceId: id,
  });
  return updated;
}
