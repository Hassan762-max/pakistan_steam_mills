import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requirePageUser } from "@/lib/require-page-user";
import { getDashboardKpis } from "@/server/services/dashboard";
import { listAuditLogs } from "@/server/services/audit";
import { listPendingWorkflows } from "@/server/services/workflows";
import { listLeaveRequests } from "@/server/services/leave";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { formatDateTime, formatNumber, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  QuickActions,
  type QuickActionIconName,
} from "@/components/dashboard/quick-actions";
import { ProductionChart } from "./production-chart";

type KpiBag = {
  hr?: { totalEmployees: number; activeEmployees: number; onLeave: number };
  production?: {
    openOrders: number;
    inProgress: number;
    completedMonth: number;
    avgEfficiency: number | null;
    targetQty: number | null;
    actualQty: number | null;
  };
  inventory?: { totalItems: number; lowStockCount: number; lowStockItems: Array<{ id: string; itemCode: string; name: string; quantity: number; reorderLevel: number }> };
  procurement?: { pendingRequests: number; openPos: number };
  maintenance?: { openWo: number; inProgressWo: number; criticalEquipment: number };
  quality?: { openNcrs: number; pendingInspections: number };
  safety?: { openIncidents: number; nearMisses: number };
  finance?: { allocated: number; spent: number; committed: number };
  workflows?: { pending: number };
  notifications?: { unread: number };
};

const QUICK_ACTIONS: Array<{
  href: string;
  label: string;
  permission: string;
  iconName: QuickActionIconName;
}> = [
  { href: "/users/new", label: "Create user", permission: P.USERS_USERS_CREATE, iconName: "Users" },
  { href: "/employees/new", label: "Add employee", permission: P.HR_EMPLOYEES_CREATE, iconName: "UserRound" },
  { href: "/leave", label: "Request leave", permission: P.HR_LEAVE_CREATE, iconName: "CalendarDays" },
  { href: "/documents", label: "Documents", permission: P.DOCUMENTS_DOCUMENTS_VIEW, iconName: "FileText" },
  { href: "/roles/new", label: "Create role", permission: P.ROLES_ROLES_CREATE, iconName: "ClipboardList" },
  { href: "/attendance", label: "Attendance", permission: P.HR_ATTENDANCE_VIEW, iconName: "CalendarDays" },
];

export default async function DashboardPage() {
  const user = await requirePageUser();

  const kpis = (await withPageAuth(() => getDashboardKpis(user))) as KpiBag & {
    generatedAt: string;
    roles: string[];
  };

  let recentActivity: Awaited<ReturnType<typeof listAuditLogs>>["items"] = [];
  if (hasPermission(user, P.AUDIT_LOGS_VIEW)) {
    try {
      const logs = await listAuditLogs(user, { pageSize: 8 });
      recentActivity = logs.items;
    } catch {
      recentActivity = [];
    }
  }

  let pendingApprovals: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    href: string;
  }> = [];

  if (hasPermission(user, P.WORKFLOWS_WORKFLOWS_VIEW)) {
    try {
      const wf = await listPendingWorkflows(user, { pageSize: 5 });
      pendingApprovals.push(
        ...wf.items.map((w) => ({
          id: w.id,
          type: "Workflow",
          title: `${w.definition.name} · ${w.resourceType}`,
          status: w.status,
          href: "/workflows",
        })),
      );
    } catch {
      /* ignore */
    }
  }

  if (hasPermission(user, P.HR_LEAVE_APPROVE) || hasPermission(user, P.HR_LEAVE_VIEW)) {
    try {
      const leave = await listLeaveRequests(user, { status: "pending", pageSize: 5 });
      pendingApprovals.push(
        ...leave.items.map((r) => ({
          id: r.id,
          type: "Leave",
          title: `${r.employee.fullName} · ${r.leaveType.name} (${r.days}d)`,
          status: r.status,
          href: "/leave",
        })),
      );
    } catch {
      /* ignore */
    }
  }

  const alerts: Array<{ id: string; severity: "warning" | "critical"; message: string; href?: string }> = [];
  if (kpis.inventory && kpis.inventory.lowStockCount > 0) {
    alerts.push({
      id: "low-stock",
      severity: kpis.inventory.lowStockCount > 5 ? "critical" : "warning",
      message: `${kpis.inventory.lowStockCount} inventory item(s) below reorder level`,
      href: "/inventory",
    });
  }
  if (kpis.maintenance && kpis.maintenance.criticalEquipment > 0) {
    alerts.push({
      id: "equip",
      severity: "critical",
      message: `${kpis.maintenance.criticalEquipment} equipment unit(s) under maintenance or breakdown`,
      href: "/maintenance",
    });
  }
  if (kpis.safety && kpis.safety.openIncidents > 0) {
    alerts.push({
      id: "safety",
      severity: "warning",
      message: `${kpis.safety.openIncidents} open safety incident(s)`,
      href: "/safety",
    });
  }
  if (kpis.quality && kpis.quality.openNcrs > 0) {
    alerts.push({
      id: "ncr",
      severity: "warning",
      message: `${kpis.quality.openNcrs} open non-conformance report(s)`,
      href: "/quality",
    });
  }

  const quickActions = QUICK_ACTIONS.filter((a) => hasPermission(user, a.permission)).map(
    ({ href, label, iconName }) => ({ href, label, iconName }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations dashboard"
        description={`Role-aware overview for ${user.firstName}. Updated ${formatDateTime(kpis.generatedAt)}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.hr ? (
          <StatCard
            title="Active employees"
            value={formatNumber(kpis.hr.activeEmployees)}
            description={`${formatNumber(kpis.hr.totalEmployees)} total · ${formatNumber(kpis.hr.onLeave)} on leave`}
            icon="UserRound"
          />
        ) : null}
        {kpis.production ? (
          <StatCard
            title="Open production orders"
            value={formatNumber(kpis.production.openOrders)}
            description={`${formatNumber(kpis.production.inProgress)} in progress · ${formatNumber(kpis.production.avgEfficiency, 1)}% avg efficiency`}
            icon="Factory"
          />
        ) : null}
        {kpis.inventory ? (
          <StatCard
            title="Inventory items"
            value={formatNumber(kpis.inventory.totalItems)}
            description={`${formatNumber(kpis.inventory.lowStockCount)} below reorder`}
            icon="Package"
          />
        ) : null}
        {kpis.procurement ? (
          <StatCard
            title="Procurement pipeline"
            value={formatNumber(kpis.procurement.openPos)}
            description={`${formatNumber(kpis.procurement.pendingRequests)} pending requests`}
            icon="ShoppingCart"
          />
        ) : null}
        {kpis.maintenance ? (
          <StatCard
            title="Open work orders"
            value={formatNumber(kpis.maintenance.openWo)}
            description={`${formatNumber(kpis.maintenance.inProgressWo)} in progress`}
            icon="Wrench"
          />
        ) : null}
        {kpis.safety ? (
          <StatCard
            title="Open safety incidents"
            value={formatNumber(kpis.safety.openIncidents)}
            description={`${formatNumber(kpis.safety.nearMisses)} near misses logged`}
            icon="HardHat"
          />
        ) : null}
        {kpis.finance ? (
          <StatCard
            title="Budget spent"
            value={formatCurrency(kpis.finance.spent)}
            description={`${formatCurrency(kpis.finance.allocated)} allocated`}
            icon="ClipboardList"
          />
        ) : null}
        {kpis.workflows ? (
          <StatCard
            title="Pending workflows"
            value={formatNumber(kpis.workflows.pending)}
            description="Awaiting action across modules"
            icon="CheckSquare"
          />
        ) : null}
      </div>

      {kpis.production ? (
        <ProductionChart
          targetQty={kpis.production.targetQty ?? 0}
          actualQty={kpis.production.actualQty ?? 0}
          openOrders={kpis.production.openOrders}
          inProgress={kpis.production.inProgress}
          completedMonth={kpis.production.completedMonth}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent py-8"
                title="No active alerts"
                description="Operational thresholds look clear for your permissions."
              />
            ) : (
              <ul className="space-y-3">
                {alerts.map((alert) => (
                  <li key={alert.id} className="rounded-md border px-3 py-2 text-sm">
                    <StatusBadge
                      status={alert.severity === "critical" ? "critical" : "pending"}
                      label={alert.severity}
                      className="mb-1.5"
                    />
                    <p>{alert.message}</p>
                    {alert.href ? (
                      <Link href={alert.href} className="mt-1 inline-block text-xs text-accent hover:underline">
                        Review
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent py-8"
                title="Nothing pending"
                description="No leave or workflow items require your action."
              />
            ) : (
              <ul className="space-y-3">
                {pendingApprovals.slice(0, 8).map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                      <p className="text-sm font-medium">{item.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={(item.status as StatusBadgeStatus) || "pending"} />
                      <Link href={item.href} className="text-xs text-accent hover:underline">
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions actions={quickActions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent py-10"
              title="No recent audit activity"
              description={
                hasPermission(user, P.AUDIT_LOGS_VIEW)
                  ? "Audit events will appear here as users make changes."
                  : "You do not have permission to view audit logs."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">When</th>
                    <th className="pb-2 pr-4 font-medium">Actor</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4">{log.actorEmail ?? "—"}</td>
                      <td className="py-2.5 pr-4 capitalize">{log.action}</td>
                      <td className="py-2.5">{log.description ?? `${log.module}.${log.resource}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
