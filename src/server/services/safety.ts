import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listIncidents(user: AuthUser, params: ListParams & { type?: string } = {}) {
  await requirePermission(user, P.SAFETY_INCIDENTS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(search
      ? {
          OR: [
            { incidentNumber: { contains: search } },
            { title: { contains: search } },
            { location: { contains: search } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.safetyIncident.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { occurredAt: sortDir },
    }),
    db.safetyIncident.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getIncident(user: AuthUser, id: string) {
  await requirePermission(user, P.SAFETY_INCIDENTS_VIEW);
  const incident = await db.safetyIncident.findUnique({ where: { id } });
  if (!incident) throw new AuthError("VALIDATION", "Incident not found");
  return incident;
}

export async function createIncident(
  user: AuthUser,
  input: {
    incidentNumber: string;
    type: string;
    title: string;
    description?: string;
    severity?: string;
    location?: string;
    plantId?: string;
    occurredAt: Date;
    injuredCount?: number;
  },
) {
  await requirePermission(user, P.SAFETY_INCIDENTS_CREATE);
  const created = await db.safetyIncident.create({
    data: {
      ...input,
      severity: input.severity ?? "low",
      status: "reported",
      reportedById: user.id,
      injuredCount: input.injuredCount ?? 0,
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "safety",
    resource: "incidents",
    resourceId: created.id,
  });
  return created;
}

export async function updateIncident(
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
  await requirePermission(user, P.SAFETY_INCIDENTS_EDIT);
  const updated = await db.safetyIncident.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "safety",
    resource: "incidents",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listSafetyInspections(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.SAFETY_INSPECTIONS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.search ? { area: { contains: params.search } } : {}),
  };
  const [items, total] = await Promise.all([
    db.safetyInspection.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.safetyInspection.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createSafetyInspection(
  user: AuthUser,
  input: {
    inspectionNo: string;
    area: string;
    inspectorName?: string;
    scheduledAt?: Date;
  },
) {
  await requirePermission(user, P.SAFETY_INSPECTIONS_CREATE);
  const created = await db.safetyInspection.create({
    data: { ...input, status: "scheduled" },
  });
  await auditMutation(user, {
    action: "create",
    module: "safety",
    resource: "inspections",
    resourceId: created.id,
  });
  return created;
}
