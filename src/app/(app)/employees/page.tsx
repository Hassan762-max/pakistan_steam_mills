import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listEmployees } from "@/server/services/employees";
import { listDepartments } from "@/server/services/organization";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/ui/list-filters";
import { ServerPagination } from "@/components/ui/server-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();
  const canCreate = hasPermission(user, P.HR_EMPLOYEES_CREATE);

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const departmentId = typeof sp.departmentId === "string" ? sp.departmentId : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const [result, departments] = await Promise.all([
    withPageAuth(() =>
      listEmployees(user, {
        search,
        employmentStatus: status === "all" ? undefined : status,
        departmentId: departmentId === "all" ? undefined : departmentId,
        page,
        pageSize: 20,
      }),
    ),
    withPageAuth(() => listDepartments(user)).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="HR employee master records across plants and departments."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/employees/new">
                <Plus className="size-4" />
                Add employee
              </Link>
            </Button>
          ) : null
        }
      />

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            { name: "search", label: "Search", type: "search", placeholder: "Name, number, CNIC…" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "terminated", label: "Terminated" },
              ],
            },
            {
              name: "departmentId",
              label: "Department",
              type: "select",
              options: departments.map((d) => ({ value: d.id, label: d.name })),
            },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState
          title="No employees found"
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/employees/new">Add employee</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employeeNumber}</TableCell>
                    <TableCell>
                      <Link
                        href={`/employees/${emp.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {emp.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{emp.department?.name ?? "—"}</TableCell>
                    <TableCell>{emp.designation?.title ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={(emp.employmentStatus as StatusBadgeStatus) || "inactive"}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(emp.joiningDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ServerPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/employees"
            searchParams={{ search, status, departmentId }}
          />
        </div>
      )}
    </div>
  );
}
