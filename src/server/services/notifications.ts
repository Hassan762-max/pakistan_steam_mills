import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listNotifications(user: AuthUser, params: ListParams & { unreadOnly?: boolean } = {}) {
  await requirePermission(user, P.NOTIFICATIONS_NOTIFICATIONS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);

  const where = {
    userId: user.id,
    ...(params.unreadOnly ? { isRead: false } : {}),
    ...(params.status === "unread" ? { isRead: false } : {}),
    ...(params.status === "read" ? { isRead: true } : {}),
  };

  const [items, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return { ...paginate(items, total, page, pageSize), unreadCount };
}

export async function markNotificationRead(user: AuthUser, id: string) {
  await requirePermission(user, P.NOTIFICATIONS_NOTIFICATIONS_VIEW);
  const n = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) throw new AuthError("VALIDATION", "Notification not found");

  return db.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(user: AuthUser) {
  await requirePermission(user, P.NOTIFICATIONS_NOTIFICATIONS_VIEW);
  const result = await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

export async function createNotification(
  user: AuthUser,
  input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    meta?: unknown;
  },
) {
  // Creating notifications for others is an admin-style mutation; reuse settings edit or dashboard.
  await requirePermission(user, P.SETTINGS_SYSTEM_EDIT);

  const created = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });

  await auditMutation(user, {
    action: "create",
    module: "notifications",
    resource: "notifications",
    resourceId: created.id,
    afterValue: { userId: input.userId, type: input.type, title: input.title },
  });

  return created;
}
