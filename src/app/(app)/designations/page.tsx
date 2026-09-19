import { requirePageUser } from "@/lib/require-page-user";
import { listDesignations } from "@/server/services/organization";
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

export default async function DesignationsPage() {
  const user = await requirePageUser();
  const designations = await withPageAuth(() => listDesignations(user));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        description="Job titles, grades, and organizational levels."
      />

      {designations.length === 0 ? (
        <EmptyState title="No designations" />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {designations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.code}</TableCell>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell>{d.grade ?? "—"}</TableCell>
                  <TableCell>{d.level}</TableCell>
                  <TableCell>{d._count.employees}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status === "active" ? "active" : "inactive"} />
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
