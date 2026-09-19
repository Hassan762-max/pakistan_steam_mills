import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listAuditLogs } from "@/server/services/audit";
import { withPageAuth } from "@/lib/page-auth";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
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

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const module = typeof sp.module === "string" ? sp.module : undefined;
  const action = typeof sp.action === "string" ? sp.action : undefined;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const result = await withPageAuth(() =>
    listAuditLogs(user, {
      search,
      module: module === "all" ? undefined : module,
      action: action === "all" ? undefined : action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page,
      pageSize: 25,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Immutable trail of system mutations and security events."
      />

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            { name: "search", label: "Search", type: "search", placeholder: "Actor, resource, description…" },
            {
              name: "module",
              label: "Module",
              type: "select",
              options: [
                "users",
                "roles",
                "hr",
                "organization",
                "production",
                "inventory",
                "procurement",
                "settings",
                "documents",
                "system",
              ].map((m) => ({ value: m, label: m })),
            },
            {
              name: "action",
              label: "Action",
              type: "select",
              options: [
                "create",
                "update",
                "delete",
                "approve",
                "reject",
                "login",
                "assign_roles",
                "enable",
                "disable",
              ].map((a) => ({ value: a, label: a })),
            },
          ]}
        />
      </Suspense>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground"
        >
          Filter dates
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState title="No audit entries" description="No logs match the current filters." />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      {log.actor
                        ? `${log.actor.firstName} ${log.actor.lastName}`
                        : log.actorEmail ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize">{log.module}</TableCell>
                    <TableCell className="capitalize">{log.action}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.resource}
                      {log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ""}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.description ?? "—"}
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
            basePath="/audit-logs"
            searchParams={{ search, module, action, from, to }}
          />
        </div>
      )}
    </div>
  );
}
