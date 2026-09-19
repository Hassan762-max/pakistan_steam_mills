import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { verifyAuditIntegrity } from "@/server/audit/service";
import { P } from "@/lib/permissions";

export async function listAuditLogs(
  user: AuthUser,
  params: ListParams & {
    module?: string;
    action?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
  } = {},
) {
  await requirePermission(user, P.AUDIT_LOGS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();

  const where = {
    ...(params.module ? { module: params.module } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.from || params.to
      ? {
          createdAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search } },
            { actorEmail: { contains: search } },
            { resource: { contains: search } },
            { resourceId: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return paginate(items, total, page, pageSize);
}

export async function getAuditLog(user: AuthUser, id: string) {
  await requirePermission(user, P.AUDIT_LOGS_VIEW);
  const entry = await db.auditLog.findUnique({
    where: { id },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!entry) throw new AuthError("VALIDATION", "Audit log not found");
  const integrityOk = await verifyAuditIntegrity(id);
  return { ...entry, integrityOk };
}

export async function exportAuditLogs(
  user: AuthUser,
  params: { module?: string; from?: Date; to?: Date } = {},
) {
  await requirePermission(user, P.AUDIT_LOGS_EXPORT);
  return db.auditLog.findMany({
    where: {
      ...(params.module ? { module: params.module } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
}
