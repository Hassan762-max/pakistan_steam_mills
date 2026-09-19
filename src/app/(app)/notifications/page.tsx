import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import { listNotifications } from "@/server/services/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.NOTIFICATIONS_NOTIFICATIONS_VIEW)) redirect("/dashboard");

  const result = await listNotifications(user, { pageSize: 100 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="System alerts, approvals, and operational updates for your account."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Unread" value={formatNumber(result.unreadCount)} icon="Bell" />
        <StatCard title="Total" value={formatNumber(result.total)} />
      </div>
      <NotificationsClient
        unreadCount={result.unreadCount}
        notifications={result.items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
