import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/require-page-user";
import { listPermissions } from "@/server/services/roles";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CreateRoleForm } from "./create-role-form";

export default async function NewRolePage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.ROLES_ROLES_CREATE)) redirect("/unauthorized");

  const permissions = await withPageAuth(() => listPermissions(user));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create role"
        description="Define a new role and select its permissions."
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
                <BreadcrumbPage>New</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <CreateRoleForm permissions={permissions} />
    </div>
  );
}
