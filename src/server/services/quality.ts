import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listInspections(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.QUALITY_INSPECTIONS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(search
      ? {
          OR: [
            { inspectionNumber: { contains: search } },
            { productName: { contains: search } },
            { batchNumber: { contains: search } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.qualityInspection.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { testResults: true, ncrs: true },
    }),
    db.qualityInspection.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getInspection(user: AuthUser, id: string) {
  await requirePermission(user, P.QUALITY_INSPECTIONS_VIEW);
  const insp = await db.qualityInspection.findUnique({
    where: { id },
    include: { testResults: true, ncrs: true, certificates: true },
  });
  if (!insp) throw new AuthError("VALIDATION", "Inspection not found");
  return insp;
}

export async function createInspection(
  user: AuthUser,
  input: {
    inspectionNumber: string;
    type: string;
    productCode?: string;
    productName?: string;
    batchNumber?: string;
    inspectorName?: string;
    testResults?: Array<{
      parameter: string;
      specification?: string;
      actualValue?: string;
      unit?: string;
      passed?: boolean;
    }>;
  },
) {
  await requirePermission(user, P.QUALITY_INSPECTIONS_CREATE);
  const created = await db.qualityInspection.create({
    data: {
      inspectionNumber: input.inspectionNumber,
      type: input.type,
      productCode: input.productCode,
      productName: input.productName,
      batchNumber: input.batchNumber,
      inspectorName: input.inspectorName,
      requestedById: user.id,
      status: "pending",
      testResults: input.testResults?.length ? { create: input.testResults } : undefined,
    },
    include: { testResults: true },
  });
  await auditMutation(user, {
    action: "create",
    module: "quality",
    resource: "inspections",
    resourceId: created.id,
  });
  return created;
}

export async function updateInspection(
  user: AuthUser,
  id: string,
  input: Partial<{
    status: string;
    resultSummary: string | null;
    inspectorName: string | null;
    inspectedAt: Date | null;
  }>,
) {
  if (input.status === "passed" || input.status === "failed" || input.status === "conditional") {
    await requirePermission(user, P.QUALITY_INSPECTIONS_APPROVE);
  } else {
    await requirePermission(user, P.QUALITY_INSPECTIONS_EDIT);
  }
  const updated = await db.qualityInspection.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "quality",
    resource: "inspections",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listNcrs(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.QUALITY_NCRS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(search
      ? { OR: [{ ncrNumber: { contains: search } }, { title: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.nonConformanceReport.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { inspection: true },
    }),
    db.nonConformanceReport.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createNcr(
  user: AuthUser,
  input: {
    ncrNumber: string;
    title: string;
    description?: string;
    severity?: string;
    inspectionId?: string;
  },
) {
  await requirePermission(user, P.QUALITY_NCRS_CREATE);
  const created = await db.nonConformanceReport.create({
    data: {
      ...input,
      severity: input.severity ?? "minor",
      status: "open",
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "quality",
    resource: "ncrs",
    resourceId: created.id,
  });
  return created;
}

export async function updateNcr(
  user: AuthUser,
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    severity: string;
    status: string;
    correctiveAction: string | null;
    closedAt: Date | null;
  }>,
) {
  await requirePermission(user, P.QUALITY_NCRS_EDIT);
  const updated = await db.nonConformanceReport.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "quality",
    resource: "ncrs",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}
