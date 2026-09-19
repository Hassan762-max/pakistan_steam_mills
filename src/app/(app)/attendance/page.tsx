import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listAttendance } from "@/server/services/attendance";
import { withPageAuth } from "@/lib/page-auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/ui/list-filters";
import { ServerPagination } from "@/components/ui/server-pagination";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
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

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();

  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const result = await withPageAuth(() =>
    listAttendance(user, {
      status: status === "all" ? undefined : status,
      page,
      pageSize: 25,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Daily attendance records across the workforce."
      />

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "present", label: "Present" },
                { value: "absent", label: "Absent" },
                { value: "late", label: "Late" },
                { value: "leave", label: "On leave" },
                { value: "holiday", label: "Holiday" },
              ],
            },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState title="No attendance records" description="Records will appear as attendance is logged." />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Check in</TableHead>
                  <TableHead>Check out</TableHead>
                  <TableHead>Late (min)</TableHead>
                  <TableHead>OT (min)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.employee.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.employee.employeeNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{row.shift?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.checkIn ? formatDateTime(row.checkIn) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.checkOut ? formatDateTime(row.checkOut) : "—"}
                    </TableCell>
                    <TableCell>{row.lateMinutes}</TableCell>
                    <TableCell>{row.overtimeMinutes}</TableCell>
                    <TableCell>
                      <StatusBadge status={(row.status as StatusBadgeStatus) || "inactive"} />
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
            basePath="/attendance"
            searchParams={{ status }}
          />
        </div>
      )}
    </div>
  );
}
