import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import {
  SESSION_COOKIE,
  generateToken,
  hashPassword,
  verifyPassword,
  evaluatePasswordStrength,
  sessionMaxAgeMs,
  lockoutConfig,
  hashToken,
} from "@/server/auth/crypto";
import { writeAuditLog } from "@/server/audit/service";
import { getEffectivePermissions } from "@/server/authorization/rbac";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  avatarUrl: string | null;
  employeeId: string | null;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  roles: { id: string; code: string; name: string }[];
  permissions: string[];
};

async function clientMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown",
    userAgent: h.get("user-agent") ?? "unknown",
  };
}

export async function createSession(userId: string) {
  const token = generateToken(48);
  const expiresAt = new Date(Date.now() + sessionMaxAgeMs());
  const meta = await clientMeta();

  await db.session.create({
    data: {
      userId,
      token: hashToken(token),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(token?: string) {
  const cookieStore = await cookies();
  const raw = token ?? cookieStore.get(SESSION_COOKIE)?.value;
  if (raw) {
    await db.session.updateMany({
      where: { token: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string, exceptToken?: string) {
  const except = exceptToken ? hashToken(exceptToken) : undefined;
  await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(except ? { NOT: { token: except } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await db.session.findFirst({
    where: {
      token: hashToken(raw),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          userRoles: { include: { role: true } },
        },
      },
    },
  });

  if (!session || session.user.status === "deactivated" || session.user.status === "inactive") {
    return null;
  }

  // Touch last active (fire-and-forget style)
  void db.session.update({
    where: { id: session.id },
    data: { lastActiveAt: new Date() },
  });

  const permissions = await getEffectivePermissions(session.userId);

  return {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    status: session.user.status,
    avatarUrl: session.user.avatarUrl,
    employeeId: session.user.employeeId,
    twoFactorEnabled: session.user.twoFactorEnabled,
    mustChangePassword: session.user.mustChangePassword,
    roles: session.user.userRoles.map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
    })),
    permissions,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("UNAUTHENTICATED", "Authentication required");
  }
  if (user.status === "locked") {
    throw new AuthError("LOCKED", "Account is locked");
  }
  // Unverified signup — email confirmation still required
  if (user.status === "pending") {
    throw new AuthError("UNVERIFIED", "Email verification required");
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    public code:
      | "UNAUTHENTICATED"
      | "UNAUTHORIZED"
      | "LOCKED"
      | "UNVERIFIED"
      | "INVALID_CREDENTIALS"
      | "VALIDATION"
      | "RATE_LIMITED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function login(emailOrUsername: string, password: string) {
  const meta = await clientMeta();
  const identifier = emailOrUsername.trim().toLowerCase();
  const { maxFailed, lockoutMinutes } = lockoutConfig();

  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  const fail = async (reason: string, userId?: string) => {
    await db.loginHistory.create({
      data: {
        userId,
        email: identifier,
        success: false,
        failureReason: reason,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email/username or password");
  };

  if (!user) {
    await fail("user_not_found");
  }

  if (user!.status === "deactivated" || user!.status === "inactive") {
    await fail("account_disabled", user!.id);
  }

  if (user!.lockedUntil && user!.lockedUntil > new Date()) {
    await db.loginHistory.create({
      data: {
        userId: user!.id,
        email: identifier,
        success: false,
        failureReason: "account_locked",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
    throw new AuthError("LOCKED", "Account is temporarily locked due to failed login attempts");
  }

  const valid = await verifyPassword(password, user!.passwordHash);
  if (!valid) {
    const failedLoginCount = user!.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= maxFailed
        ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
        : null;

    await db.user.update({
      where: { id: user!.id },
      data: {
        failedLoginCount,
        lockedUntil,
        status: lockedUntil ? "locked" : user!.status,
      },
    });

    await fail("bad_password", user!.id);
  }

  if (user!.status === "pending") {
    await db.loginHistory.create({
      data: {
        userId: user!.id,
        email: identifier,
        success: false,
        failureReason: "email_unverified",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
    throw new AuthError(
      "UNVERIFIED",
      "Please verify your email before signing in. Check your inbox or the verification link from signup.",
    );
  }

  if (user!.status === "pending_approval") {
    // Verified but awaiting admin role assignment — allow login
  } else if (user!.status !== "active" && user!.status !== "locked") {
    // locked already handled above; inactive/deactivated already handled
  }

  await db.user.update({
    where: { id: user!.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      status: user!.status === "locked" ? "active" : user!.status,
    },
  });

  await db.loginHistory.create({
    data: {
      userId: user!.id,
      email: user!.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  await createSession(user!.id);

  await writeAuditLog({
    actorId: user!.id,
    actorEmail: user!.email,
    action: "login",
    module: "auth",
    resource: "session",
    description: "User logged in",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    userId: user!.id,
    mustChangePassword: user!.mustChangePassword,
    status: user!.status === "locked" ? "active" : user!.status,
    awaitingRoleAssignment: user!.status === "pending_approval",
  };
}

export async function signup(input: {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const strength = evaluatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new AuthError("VALIDATION", strength.feedback[0] ?? "Password is too weak");
  }

  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    throw new AuthError("VALIDATION", "Email or username already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email,
      username,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone,
      status: "pending",
    },
  });

  const token = generateToken(32);
  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Self-registered users get NO roles until an administrator assigns one.
  await db.notificationPreference.create({
    data: { userId: user.id },
  });

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "signup",
    module: "auth",
    resource: "user",
    resourceId: user.id,
    description: "User self-registered — awaiting email verification and role assignment",
  });

  // In production this would be emailed; exposed for demo activation
  return { userId: user.id, verificationToken: token };
}

export async function verifyEmail(token: string) {
  const record = await db.emailVerificationToken.findFirst({
    where: {
      token: hashToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  if (!record) throw new AuthError("VALIDATION", "Invalid or expired verification link");

  await db.$transaction([
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      // Verified email, but access waits for admin role assignment
      data: { emailVerifiedAt: new Date(), status: "pending_approval" },
    }),
  ]);

  const { notifyRoleAssigners } = await import("@/server/notifications/system");
  const fullName = `${record.user.firstName} ${record.user.lastName}`.trim();
  await notifyRoleAssigners({
    title: "New user awaiting role assignment",
    message: `${fullName} (${record.user.email}) verified their email and needs a role before they can use the system.`,
    link: `/users/${record.userId}`,
    meta: { userId: record.userId, event: "signup_verified" },
    excludeUserId: record.userId,
  });

  await writeAuditLog({
    actorId: record.userId,
    actorEmail: record.user.email,
    action: "email_verified",
    module: "auth",
    resource: "user",
    resourceId: record.userId,
    description: "Email verified — pending admin role assignment",
  });

  return { userId: record.userId, status: "pending_approval" as const };
}

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  // Always return success to avoid account enumeration
  if (!user) return { ok: true as const, token: null };

  const token = generateToken(32);
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "password_reset_requested",
    module: "auth",
    resource: "user",
    resourceId: user.id,
  });

  return { ok: true as const, token };
}

export async function resetPassword(token: string, newPassword: string) {
  const strength = evaluatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new AuthError("VALIDATION", strength.feedback[0] ?? "Password is too weak");
  }

  const record = await db.passwordResetToken.findFirst({
    where: {
      token: hashToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) throw new AuthError("VALIDATION", "Invalid or expired reset link");

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        status: "active",
      },
    }),
    db.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    actorId: record.userId,
    action: "password_reset",
    module: "auth",
    resource: "user",
    resourceId: record.userId,
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new AuthError("INVALID_CREDENTIALS", "Current password is incorrect");

  const strength = evaluatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new AuthError("VALIDATION", strength.feedback[0] ?? "Password is too weak");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    },
  });

  const cookieStore = await cookies();
  const current = cookieStore.get(SESSION_COOKIE)?.value;
  await destroyAllSessions(userId, current);

  await writeAuditLog({
    actorId: userId,
    actorEmail: user.email,
    action: "password_change",
    module: "auth",
    resource: "user",
    resourceId: userId,
  });
}

export async function logout() {
  const user = await getSessionUser();
  const meta = await clientMeta();
  await destroySession();
  if (user) {
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "logout",
      module: "auth",
      resource: "session",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
