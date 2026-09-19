import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/require-page-user";
import { listDepartments, listDesignations, listPlants } from "@/server/services/organization";
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
import { CreateEmployeeForm } from "./create-employee-form";

export default async function NewEmployeePage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.HR_EMPLOYEES_CREATE)) redirect("/unauthorized");

  const [departments, designations, plants] = await Promise.all([
    withPageAuth(() => listDepartments(user)).catch(() => []),
    withPageAuth(() => listDesignations(user)).catch(() => []),
    withPageAuth(() => listPlants(user)).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add employee"
        description="Create a new HR employee master record."
        breadcrumbs={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/employees">Employees</Link>
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
      <CreateEmployeeForm
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        designations={designations.map((d) => ({ id: d.id, label: d.title }))}
        plants={plants.map((p) => ({ id: p.id, label: p.name }))}
      />
    </div>
  );
}
