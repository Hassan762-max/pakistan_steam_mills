import { db } from "@/server/db";
import { permissionCode, SYSTEM_ROLES, PERMISSION_CATALOG } from "@/lib/permissions";
import { AuthError, type AuthUser } from "@/server/auth/service";

export async function getEffectivePermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
      userPermissions: { include: { permission: true } },
    },
  });

  if (!user) return [];

  const allowed = new Set<string>();
  const denied = new Set<string>();

  for (const ur of user.userRoles) {
    if (!ur.role.isActive) continue;
    if (ur.role.code === "super_admin") {
      return PERMISSION_CATALOG.map((p) => permissionCode(p.module, p.resource, p.action));
    }
    for (const rp of ur.role.rolePermissions) {
      allowed.add(rp.permission.code);
    }
  }

  for (const up of user.userPermissions) {
    if (up.effect === "deny") denied.add(up.permission.code);
    else allowed.add(up.permission.code);
  }

  for (const code of denied) allowed.delete(code);
  return Array.from(allowed);
}

export function hasPermission(user: Pick<AuthUser, "permissions">, code: string) {
  return user.permissions.includes(code);
}

export function hasAnyPermission(user: Pick<AuthUser, "permissions">, codes: string[]) {
  return codes.some((c) => user.permissions.includes(c));
}

export function hasAllPermissions(user: Pick<AuthUser, "permissions">, codes: string[]) {
  return codes.every((c) => user.permissions.includes(c));
}

export async function requirePermission(user: AuthUser, code: string) {
  if (!hasPermission(user, code)) {
    throw new AuthError("UNAUTHORIZED", "You do not have permission to perform this action");
  }
}

export async function requireAnyPermission(user: AuthUser, codes: string[]) {
  if (!hasAnyPermission(user, codes)) {
    throw new AuthError("UNAUTHORIZED", "You do not have permission to perform this action");
  }
}

export function resolveRolePermissionCodes(roleCode: string): string[] {
  const role = SYSTEM_ROLES.find((r) => r.code === roleCode);
  if (!role) return [];
  if ("allPermissions" in role && role.allPermissions) {
    return PERMISSION_CATALOG.map((p) => permissionCode(p.module, p.resource, p.action));
  }
  if ("permissions" in role && role.permissions) {
    return [...role.permissions];
  }

  const modules = "modules" in role ? role.modules : undefined;
  const actions = "actions" in role ? role.actions : undefined;

  return PERMISSION_CATALOG.filter((p) => {
    if (modules && !(modules as readonly string[]).includes(p.module)) return false;
    if (actions && !(actions as readonly string[]).includes(p.action)) return false;
    return true;
  }).map((p) => permissionCode(p.module, p.resource, p.action));
}
