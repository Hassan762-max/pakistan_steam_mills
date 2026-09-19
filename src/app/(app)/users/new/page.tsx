import Link from "next/link";
import { requirePageUser } from "@/lib/require-page-user";
import { listRoles } from "@/server/services/roles";
import { withPageAuth } from "@/lib/page-auth";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CreateUserForm } from "./create-user-form";

export default async function NewUserPage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.USERS_USERS_CREATE)) redirect("/unauthorized");

  const roles = await withPageAuth(() => listRoles(user, { pageSize: 100, status: "active" }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create user"
        description="Provision a new system account and assign roles."
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
                <BreadcrumbPage>New</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <CreateUserForm
        roles={roles.items.map((r) => ({ id: r.id, name: r.name, code: r.code }))}
      />
    </div>
  );
}
