import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthError } from "@/server/auth/service";
import { requirePageUser } from "@/lib/require-page-user";
import { getUser, getUserActivity } from "@/server/services/users";
import { listRoles } from "@/server/services/roles";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { UserActions } from "./user-actions";

type Params = Promise<{ id: string }>;

export default async function UserDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const actor = await requirePageUser();

  let target;
  try {
    target = await getUser(actor, id);
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      const { redirect } = await import("next/navigation");
      redirect("/unauthorized");
    }
    if (error instanceof AuthError && error.code === "VALIDATION") notFound();
    throw error;
  }

  const activity = await withPageAuth(() => getUserActivity(actor, id));
  let roleOptions: { id: string; name: string; code: string }[] = [];
  if (hasPermission(actor, P.ROLES_ROLES_VIEW)) {
    try {
      const rolesResult = await listRoles(actor, { pageSize: 100 });
      roleOptions = rolesResult.items.map((r) => ({ id: r.id, name: r.name, code: r.code }));
    } catch {
      roleOptions = [];
    }
  }

  const canEdit = hasPermission(actor, P.USERS_USERS_EDIT);
  const canAssign = hasPermission(actor, P.USERS_USERS_ASSIGN);
  const awaitingRole = target.status === "pending_approval" || target.userRoles.length === 0;

  return (
    <div className="space-y-6">
      {awaitingRole ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium">This user is awaiting role assignment</p>
          <p className="mt-1 text-muted-foreground">
            Assign at least one role below to activate full system access and notify the user.
          </p>
        </div>
      ) : null}

      <PageHeader
        title={`${target.firstName} ${target.lastName}`}
        description={target.email}
        breadcrumbs={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/users">Users</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {target.firstName} {target.lastName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        actions={
          <UserActions
            userId={target.id}
            status={target.status}
            firstName={target.firstName}
            lastName={target.lastName}
            phone={target.phone}
            canEdit={canEdit}
            canAssign={canAssign}
            roles={roleOptions}
            assignedRoleIds={target.userRoles.map((ur) => ur.roleId)}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={(target.status as StatusBadgeStatus) || "inactive"} />
        <span className="text-sm text-muted-foreground">@{target.username}</span>
        {target.lastLoginAt ? (
          <span className="text-sm text-muted-foreground">
            Last login {formatDateTime(target.lastLoginAt)}
          </span>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="login">Login history</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Email" value={target.email} />
                <Row label="Phone" value={target.phone ?? "—"} />
                <Row label="Must change password" value={target.mustChangePassword ? "Yes" : "No"} />
                <Row label="Created" value={formatDateTime(target.createdAt)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked employee</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {target.employee ? (
                  <div className="space-y-2">
                    <Row
                      label="Name"
                      value={
                        <Link
                          href={`/employees/${target.employee.id}`}
                          className="text-accent hover:underline"
                        >
                          {target.employee.fullName}
                        </Link>
                      }
                    />
                    <Row label="Number" value={target.employee.employeeNumber} />
                    <Row label="Department" value={target.employee.department?.name ?? "—"} />
                    <Row label="Designation" value={target.employee.designation?.title ?? "—"} />
                  </div>
                ) : (
                  <EmptyState
                    className="border-0 bg-transparent py-6"
                    title="No employee link"
                    description="This account is not linked to an HR employee record."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned roles</CardTitle>
            </CardHeader>
            <CardContent>
              {target.userRoles.length === 0 ? (
                <EmptyState
                  className="border-0 bg-transparent py-8"
                  title="No roles assigned"
                  description="Use Assign roles to grant access."
                />
              ) : (
                <ul className="divide-y">
                  {target.userRoles.map((ur) => (
                    <li key={ur.roleId} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">{ur.role.name}</p>
                        <p className="text-muted-foreground">{ur.role.code}</p>
                      </div>
                      <Link href={`/roles/${ur.roleId}`} className="text-accent hover:underline">
                        View role
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.auditLogs.length === 0 ? (
                <EmptyState
                  className="border-0 bg-transparent py-8"
                  title="No activity"
                  description="This user has not generated audit events yet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">When</th>
                        <th className="pb-2 pr-3 font-medium">Action</th>
                        <th className="pb-2 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border/50">
                          <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="py-2 pr-3 capitalize">{log.action}</td>
                          <td className="py-2">
                            {log.description ?? `${log.module}.${log.resource}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Login history</CardTitle>
              </CardHeader>
              <CardContent>
                {activity.loginHistory.length === 0 ? (
                  <EmptyState
                    className="border-0 bg-transparent py-8"
                    title="No logins"
                    description="Login attempts will appear here."
                  />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {activity.loginHistory.map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-2 border-b border-border/50 py-2">
                        <div>
                          <p className="font-medium">{entry.success ? "Success" : "Failed"}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.ipAddress ?? "—"} · {entry.userAgent?.slice(0, 48) ?? "—"}
                          </p>
                        </div>
                        <span className="shrink-0 text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {activity.sessions.filter((s) => !s.revokedAt).length === 0 ? (
                  <EmptyState
                    className="border-0 bg-transparent py-8"
                    title="No active sessions"
                  />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {activity.sessions
                      .filter((s) => !s.revokedAt)
                      .map((s) => (
                        <li key={s.id} className="border-b border-border/50 py-2">
                          <p>{s.ipAddress ?? "Unknown IP"}</p>
                          <p className="text-xs text-muted-foreground">
                            Last active {formatDateTime(s.lastActiveAt)} · expires{" "}
                            {formatDateTime(s.expiresAt)}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
