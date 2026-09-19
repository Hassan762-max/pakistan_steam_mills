import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { hashPassword, evaluatePasswordStrength } from "@/server/auth/crypto";
import { destroyAllSessions } from "@/server/auth/service";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export type UserListParams = ListParams & {
  roleCode?: string;
  departmentId?: string;
};

export async function listUsers(user: AuthUser, params: UserListParams = {}) {
  await requirePermission(user, P.USERS_USERS_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();

  const where = {
    ...(params.status ? { status: params.status } : { NOT: { status: "deactivated" } }),
    ...(params.roleCode
      ? { userRoles: { some: { role: { code: params.roleCode } } } }
      : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search } },
            { username: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ],
        }
      : {}),
  };

  const sortBy = params.sortBy ?? "createdAt";
  const orderBy =
    sortBy === "email"
      ? { email: sortDir }
      : sortBy === "username"
        ? { username: sortDir }
        : sortBy === "status"
          ? { status: sortDir }
          : sortBy === "firstName"
            ? { firstName: sortDir }
            : { createdAt: sortDir };

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        employeeId: true,
        createdAt: true,
        userRoles: { include: { role: { select: { id: true, code: true, name: true } } } },
      },
    }),
    db.user.count({ where }),
  ]);

  return paginate(items, total, page, pageSize);
}

export async function getUser(user: AuthUser, id: string) {
  await requirePermission(user, P.USERS_USERS_VIEW);
  const found = await db.user.findUnique({
    where: { id },
    include: {
      userRoles: { include: { role: true } },
      userPermissions: { include: { permission: true } },
      employee: { include: { department: true, designation: true } },
      notificationPrefs: true,
    },
  });
  if (!found) throw new AuthError("VALIDATION", "User not found");
  const { passwordHash: _, ...safe } = found;
  return safe;
}

export async function createUser(
  user: AuthUser,
  input: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleIds?: string[];
    employeeId?: string;
    mustChangePassword?: boolean;
  },
) {
  await requirePermission(user, P.USERS_USERS_CREATE);
  const strength = evaluatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new AuthError("VALIDATION", strength.feedback[0] ?? "Password is too weak");
  }

  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const existing = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) throw new AuthError("VALIDATION", "Email or username already exists");

  const passwordHash = await hashPassword(input.password);
  const hasRoles = Boolean(input.roleIds?.length);
  const created = await db.user.create({
    data: {
      email,
      username,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone,
      status: hasRoles ? "active" : "pending_approval",
      emailVerifiedAt: new Date(),
      mustChangePassword: input.mustChangePassword ?? true,
      employeeId: input.employeeId,
      createdById: user.id,
      userRoles: hasRoles
        ? { create: input.roleIds!.map((roleId) => ({ roleId, assignedBy: user.id })) }
        : undefined,
      notificationPrefs: { create: {} },
    },
    include: { userRoles: { include: { role: true } } },
  });

  await auditMutation(user, {
    action: "create",
    module: "users",
    resource: "users",
    resourceId: created.id,
    description: `Created user ${created.email}${hasRoles ? "" : " (awaiting role assignment)"}`,
    afterValue: { email: created.email, username: created.username, status: created.status },
  });

  if (!hasRoles) {
    const { notifyRoleAssigners, notifyUser } = await import("@/server/notifications/system");
    await notifyRoleAssigners({
      title: "User created — role required",
      message: `${created.firstName} ${created.lastName} (${created.email}) was created without a role and needs assignment.`,
      link: `/users/${created.id}`,
      meta: { userId: created.id, event: "admin_created_pending" },
      excludeUserId: user.id,
    });
    // Also notify the creator so it appears in their center
    await notifyUser({
      userId: user.id,
      type: "approval",
      title: "Assign a role to new user",
      message: `${created.firstName} ${created.lastName} needs a role before they can use the system.`,
      link: `/users/${created.id}`,
      meta: { userId: created.id },
    });
  }

  const { passwordHash: _, ...safe } = created;
  return safe;
}

export async function updateUser(
  user: AuthUser,
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    employeeId?: string | null;
  },
) {
  await requirePermission(user, P.USERS_USERS_EDIT);
  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw new AuthError("VALIDATION", "User not found");
  if (before.status === "deactivated") {
    throw new AuthError("VALIDATION", "Cannot update a deactivated user");
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      employeeId: input.employeeId,
    },
  });

  await auditMutation(user, {
    action: "update",
    module: "users",
    resource: "users",
    resourceId: id,
    beforeValue: { firstName: before.firstName, lastName: before.lastName },
    afterValue: { firstName: updated.firstName, lastName: updated.lastName },
  });

  const { passwordHash: _, ...safe } = updated;
  return safe;
}

export async function setUserStatus(user: AuthUser, id: string, status: "active" | "inactive") {
  await requirePermission(user, P.USERS_USERS_EDIT);
  if (id === user.id) throw new AuthError("VALIDATION", "You cannot change your own account status");

  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw new AuthError("VALIDATION", "User not found");
  if (before.status === "deactivated") {
    throw new AuthError("VALIDATION", "Deactivated users cannot be re-enabled here; restore first");
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      status,
      ...(status === "inactive"
        ? { deactivatedAt: new Date(), deactivatedById: user.id }
        : { deactivatedAt: null, deactivatedById: null, lockedUntil: null, failedLoginCount: 0 }),
    },
  });

  if (status === "inactive") {
    await destroyAllSessions(id);
  }

  await auditMutation(user, {
    action: status === "active" ? "enable" : "disable",
    module: "users",
    resource: "users",
    resourceId: id,
    beforeValue: { status: before.status },
    afterValue: { status: updated.status },
  });

  return updated;
}

export async function softDeleteUser(user: AuthUser, id: string) {
  await requirePermission(user, P.USERS_USERS_DELETE);
  if (id === user.id) throw new AuthError("VALIDATION", "You cannot delete your own account");

  const before = await db.user.findUnique({
    where: { id },
    include: { userRoles: { include: { role: true } } },
  });
  if (!before) throw new AuthError("VALIDATION", "User not found");
  if (before.userRoles.some((ur) => ur.role.code === "super_admin")) {
    throw new AuthError("VALIDATION", "Super administrator accounts cannot be soft-deleted");
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      status: "deactivated",
      deactivatedAt: new Date(),
      deactivatedById: user.id,
    },
  });
  await destroyAllSessions(id);

  await auditMutation(user, {
    action: "soft_delete",
    module: "users",
    resource: "users",
    resourceId: id,
    description: `Soft-deleted user ${before.email}`,
  });

  return updated;
}

export async function assignRoles(user: AuthUser, userId: string, roleIds: string[]) {
  await requirePermission(user, P.USERS_USERS_ASSIGN);
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new AuthError("VALIDATION", "User not found");

  if (roleIds.length === 0) {
    throw new AuthError("VALIDATION", "Select at least one role to assign");
  }

  const wasAwaitingApproval = target.status === "pending_approval" || target.status === "pending";

  await db.$transaction([
    db.userRole.deleteMany({ where: { userId } }),
    ...roleIds.map((roleId) =>
      db.userRole.create({
        data: { userId, roleId, assignedBy: user.id },
      }),
    ),
    ...(wasAwaitingApproval || target.status !== "active"
      ? [
          db.user.update({
            where: { id: userId },
            data: {
              status: "active",
              emailVerifiedAt: target.emailVerifiedAt ?? new Date(),
              lockedUntil: null,
              failedLoginCount: 0,
            },
          }),
        ]
      : []),
  ]);

  await auditMutation(user, {
    action: "assign_roles",
    module: "users",
    resource: "users",
    resourceId: userId,
    afterValue: { roleIds, activated: wasAwaitingApproval },
  });

  const { notifyUser } = await import("@/server/notifications/system");
  await notifyUser({
    userId,
    type: "approval",
    title: wasAwaitingApproval ? "Access approved" : "Roles updated",
    message: wasAwaitingApproval
      ? "An administrator assigned you a role. You now have access to Pakistan Steel Mills Management System."
      : "Your assigned roles were updated by an administrator.",
    link: "/dashboard",
    meta: { roleIds, assignedBy: user.id },
  });

  return getUser(user, userId);
}

export async function removeRole(user: AuthUser, userId: string, roleId: string) {
  await requirePermission(user, P.USERS_USERS_ASSIGN);
  await db.userRole.deleteMany({ where: { userId, roleId } });
  await auditMutation(user, {
    action: "remove_role",
    module: "users",
    resource: "users",
    resourceId: userId,
    afterValue: { roleId },
  });
  return getUser(user, userId);
}

export async function resetUserPassword(user: AuthUser, userId: string, newPassword: string) {
  await requirePermission(user, P.USERS_USERS_EDIT);
  const strength = evaluatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new AuthError("VALIDATION", strength.feedback[0] ?? "Password is too weak");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await destroyAllSessions(userId);

  await auditMutation(user, {
    action: "password_reset_admin",
    module: "users",
    resource: "users",
    resourceId: userId,
    description: "Administrator reset user password",
  });

  return { ok: true as const };
}

export async function forceLogout(user: AuthUser, userId: string) {
  await requirePermission(user, P.USERS_USERS_EDIT);
  await destroyAllSessions(userId);
  await auditMutation(user, {
    action: "force_logout",
    module: "users",
    resource: "users",
    resourceId: userId,
  });
  return { ok: true as const };
}

export async function getUserActivity(user: AuthUser, userId: string, limit = 50) {
  await requirePermission(user, P.USERS_USERS_VIEW);
  const [loginHistory, auditLogs, sessions] = await Promise.all([
    db.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: "desc" },
      take: 20,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    }),
  ]);
  return { loginHistory, auditLogs, sessions };
}
