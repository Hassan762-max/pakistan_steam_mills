import { requirePageUser } from "@/lib/require-page-user";
import { listDepartments } from "@/server/services/organization";
import { withPageAuth } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DepartmentsPage() {
  const user = await requirePageUser();
  const departments = await withPageAuth(() => listDepartments(user));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Organizational departments and headcount."
      />

      {departments.length === 0 ? (
        <EmptyState title="No departments" description="Departments will appear once configured." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Cost center</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-mono text-xs">{dept.code}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.division?.name ?? "—"}</TableCell>
                  <TableCell>{dept.costCenter ?? "—"}</TableCell>
                  <TableCell>{dept._count.employees}</TableCell>
                  <TableCell>{dept.sections.length}</TableCell>
                  <TableCell>
                    <StatusBadge status={dept.status === "active" ? "active" : "inactive"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
