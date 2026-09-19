import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listRoles(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.ROLES_ROLES_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();

  const where = {
    ...(params.status === "active" ? { isActive: true } : {}),
    ...(params.status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.role.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: sortDir },
      include: {
        _count: { select: { userRoles: true, rolePermissions: true } },
      },
    }),
    db.role.count({ where }),
  ]);

  return paginate(items, total, page, pageSize);
}

export async function getRole(user: AuthUser, id: string) {
  await requirePermission(user, P.ROLES_ROLES_VIEW);
  const role = await db.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      userRoles: {
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          },
        },
      },
    },
  });
  if (!role) throw new AuthError("VALIDATION", "Role not found");
  return role;
}

export async function createRole(
  user: AuthUser,
  input: { code: string; name: string; description?: string; permissionIds?: string[] },
) {
  await requirePermission(user, P.ROLES_ROLES_CREATE);
  const code = input.code.trim().toLowerCase().replace(/\s+/g, "_");
  const existing = await db.role.findUnique({ where: { code } });
  if (existing) throw new AuthError("VALIDATION", "Role code already exists");

  const created = await db.role.create({
    data: {
      code,
      name: input.name.trim(),
      description: input.description,
      isSystem: false,
      isActive: true,
      rolePermissions: input.permissionIds?.length
        ? { create: input.permissionIds.map((permissionId) => ({ permissionId })) }
        : undefined,
    },
    include: { rolePermissions: { include: { permission: true } } },
  });

  await auditMutation(user, {
    action: "create",
    module: "roles",
    resource: "roles",
    resourceId: created.id,
    afterValue: { code: created.code, name: created.name },
  });

  return created;
}

export async function updateRole(
  user: AuthUser,
  id: string,
  input: { name?: string; description?: string | null },
) {
  await requirePermission(user, P.ROLES_ROLES_EDIT);
  const before = await db.role.findUnique({ where: { id } });
  if (!before) throw new AuthError("VALIDATION", "Role not found");

  const updated = await db.role.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      description: input.description,
    },
  });

  await auditMutation(user, {
    action: "update",
    module: "roles",
    resource: "roles",
    resourceId: id,
    beforeValue: { name: before.name },
    afterValue: { name: updated.name },
  });

  return updated;
}

export async function deleteRole(user: AuthUser, id: string) {
  await requirePermission(user, P.ROLES_ROLES_DELETE);
  const role = await db.role.findUnique({
    where: { id },
    include: { _count: { select: { userRoles: true } } },
  });
  if (!role) throw new AuthError("VALIDATION", "Role not found");
  if (role.isSystem) throw new AuthError("VALIDATION", "System roles cannot be deleted");
  if (role._count.userRoles > 0) {
    throw new AuthError("VALIDATION", "Remove all users from this role before deleting");
  }

  await db.role.delete({ where: { id } });
  await auditMutation(user, {
    action: "delete",
    module: "roles",
    resource: "roles",
    resourceId: id,
    description: `Deleted role ${role.code}`,
  });
  return { ok: true as const };
}

export async function duplicateRole(user: AuthUser, id: string, newCode?: string, newName?: string) {
  await requirePermission(user, P.ROLES_ROLES_CREATE);
  const source = await db.role.findUnique({
    where: { id },
    include: { rolePermissions: true },
  });
  if (!source) throw new AuthError("VALIDATION", "Role not found");

  const code = (newCode ?? `${source.code}_copy`).trim().toLowerCase().replace(/\s+/g, "_");
  const existing = await db.role.findUnique({ where: { code } });
  if (existing) throw new AuthError("VALIDATION", "Role code already exists");

  const created = await db.role.create({
    data: {
      code,
      name: newName ?? `${source.name} (Copy)`,
      description: source.description,
      isSystem: false,
      isActive: true,
      rolePermissions: {
        create: source.rolePermissions.map((rp) => ({ permissionId: rp.permissionId })),
      },
    },
    include: { rolePermissions: { include: { permission: true } } },
  });

  await auditMutation(user, {
    action: "duplicate",
    module: "roles",
    resource: "roles",
    resourceId: created.id,
    afterValue: { sourceId: id, code: created.code },
  });

  return created;
}

export async function setRoleActive(user: AuthUser, id: string, isActive: boolean) {
  await requirePermission(user, P.ROLES_ROLES_EDIT);
  const role = await db.role.findUnique({ where: { id } });
  if (!role) throw new AuthError("VALIDATION", "Role not found");
  if (role.isSystem && role.code === "super_admin" && !isActive) {
    throw new AuthError("VALIDATION", "Super Administrator role cannot be deactivated");
  }

  const updated = await db.role.update({ where: { id }, data: { isActive } });
  await auditMutation(user, {
    action: isActive ? "activate" : "deactivate",
    module: "roles",
    resource: "roles",
    resourceId: id,
  });
  return updated;
}

export async function assignPermissions(user: AuthUser, roleId: string, permissionIds: string[]) {
  await requirePermission(user, P.ROLES_ROLES_ASSIGN);
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AuthError("VALIDATION", "Role not found");
  if (role.code === "super_admin") {
    throw new AuthError("VALIDATION", "Super Administrator permissions are implicit and cannot be edited");
  }

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId } }),
    ...permissionIds.map((permissionId) =>
      db.rolePermission.create({ data: { roleId, permissionId } }),
    ),
  ]);

  await auditMutation(user, {
    action: "assign_permissions",
    module: "roles",
    resource: "roles",
    resourceId: roleId,
    afterValue: { permissionCount: permissionIds.length },
  });

  return getRole(user, roleId);
}

export async function assignUsersToRole(user: AuthUser, roleId: string, userIds: string[]) {
  await requirePermission(user, P.ROLES_ROLES_ASSIGN);
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AuthError("VALIDATION", "Role not found");

  for (const userId of userIds) {
    const existing = await db.userRole.findFirst({ where: { userId, roleId } });
    if (!existing) {
      await db.userRole.create({ data: { userId, roleId, assignedBy: user.id } });
    }
  }

  await auditMutation(user, {
    action: "assign_users",
    module: "roles",
    resource: "roles",
    resourceId: roleId,
    afterValue: { userIds },
  });

  return getRole(user, roleId);
}

export async function listPermissions(user: AuthUser) {
  await requirePermission(user, P.ROLES_PERMISSIONS_VIEW);
  return db.permission.findMany({ orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }] });
}
