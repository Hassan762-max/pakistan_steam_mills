import { db } from "@/server/db";
import { permissionCode } from "@/lib/permissions";

/**
 * System-level notification helper (no actor permission check).
 * Used for signup / approval workflows.
 */
export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  meta?: unknown;
}) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

/** Notify every user who can assign roles (admins). */
export async function notifyRoleAssigners(input: {
  title: string;
  message: string;
  link?: string;
  meta?: unknown;
  excludeUserId?: string;
}) {
  const assignCode = permissionCode("users", "users", "assign");

  const admins = await db.user.findMany({
    where: {
      status: { in: ["active"] },
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
      OR: [
        {
          userRoles: {
            some: {
              role: {
                isActive: true,
                OR: [
                  { code: { in: ["super_admin", "administrator"] } },
                  {
                    rolePermissions: {
                      some: { permission: { code: assignCode } },
                    },
                  },
                ],
              },
            },
          },
        },
        {
          userPermissions: {
            some: {
              effect: "allow",
              permission: { code: assignCode },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (admins.length === 0) return { notified: 0 };

  await db.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "approval",
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    })),
  });

  return { notified: admins.length };
}
