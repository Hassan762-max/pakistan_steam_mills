import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listLeaveRequests, listLeaveTypes } from "@/server/services/leave";
import { listEmployees } from "@/server/services/employees";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { formatDate } from "@/lib/utils";
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
import { LeaveActions, LeaveRowActions } from "./leave-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LeavePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();

  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const canCreate = hasPermission(user, P.HR_LEAVE_CREATE);
  const canApprove = hasPermission(user, P.HR_LEAVE_APPROVE);
  const canReject = hasPermission(user, P.HR_LEAVE_REJECT);

  const [result, leaveTypes, employees] = await Promise.all([
    withPageAuth(() =>
      listLeaveRequests(user, {
        status: status === "all" ? undefined : status,
        page,
        pageSize: 20,
      }),
    ),
    withPageAuth(() => listLeaveTypes(user)).catch(() => []),
    canCreate
      ? withPageAuth(() => listEmployees(user, { pageSize: 100, employmentStatus: "active" })).catch(
          () => ({ items: [] as Awaited<ReturnType<typeof listEmployees>>["items"] }),
        )
      : Promise.resolve({ items: [] as Awaited<ReturnType<typeof listEmployees>>["items"] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="Leave requests, balances, and approvals."
        actions={
          <LeaveActions
            canCreate={canCreate}
            canApprove={canApprove}
            canReject={canReject}
            leaveTypes={leaveTypes.map((t) => ({ id: t.id, label: t.name }))}
            employees={employees.items.map((e) => ({
              id: e.id,
              label: `${e.fullName} (${e.employeeNumber})`,
            }))}
            pendingIds={result.items.filter((r) => r.status === "pending").map((r) => r.id)}
          />
        }
      />

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "cancelled", label: "Cancelled" },
              ],
            },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState title="No leave requests" description="Submit a leave request to get started." />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.employee.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.employee.employeeNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{req.leaveType.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(req.startDate)} → {formatDate(req.endDate)}
                    </TableCell>
                    <TableCell>{req.days}</TableCell>
                    <TableCell>
                      <StatusBadge status={(req.status as StatusBadgeStatus) || "pending"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.approver
                        ? `${req.approver.firstName} ${req.approver.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <LeaveRowActions
                        id={req.id}
                        status={req.status}
                        canApprove={canApprove}
                        canReject={canReject}
                      />
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
            basePath="/leave"
            searchParams={{ status }}
          />
        </div>
      )}
    </div>
  );
}
