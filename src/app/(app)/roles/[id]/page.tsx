import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthError } from "@/server/auth/service";
import { requirePageUser } from "@/lib/require-page-user";
import { getRole, listPermissions } from "@/server/services/roles";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { RoleEditor } from "./role-editor";

type Params = Promise<{ id: string }>;

export default async function RoleDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requirePageUser();

  let role;
  try {
    role = await getRole(user, id);
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      const { redirect } = await import("next/navigation");
      redirect("/unauthorized");
    }
    if (error instanceof AuthError && error.code === "VALIDATION") notFound();
    throw error;
  }

  const allPermissions = hasPermission(user, P.ROLES_PERMISSIONS_VIEW)
    ? await listPermissions(user).catch(() => [])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={role.name}
        description={role.description ?? role.code}
        breadcrumbs={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/roles">Roles</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{role.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={role.isActive ? "active" : "inactive"} />
        <span className="font-mono text-sm text-muted-foreground">{role.code}</span>
      </div>

      <RoleEditor
        roleId={role.id}
        name={role.name}
        description={role.description}
        code={role.code}
        isSystem={role.isSystem}
        locked={role.code === "super_admin"}
        canEdit={hasPermission(user, P.ROLES_ROLES_EDIT)}
        canAssign={hasPermission(user, P.ROLES_ROLES_ASSIGN)}
        allPermissions={allPermissions}
        assignedPermissionIds={role.rolePermissions.map((rp) => rp.permissionId)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned users</CardTitle>
        </CardHeader>
        <CardContent>
          {role.userRoles.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent py-8"
              title="No users assigned"
              description="Assign this role from a user profile."
            />
          ) : (
            <ul className="divide-y">
              {role.userRoles.map((ur) => (
                <li key={ur.userId} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <Link
                      href={`/users/${ur.user.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {ur.user.firstName} {ur.user.lastName}
                    </Link>
                    <p className="text-muted-foreground">{ur.user.email}</p>
                  </div>
                  <StatusBadge status={(ur.user.status as "active" | "inactive") || "inactive"} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
