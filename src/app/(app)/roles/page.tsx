import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listRoles } from "@/server/services/roles";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { RoleRowActions } from "./role-row-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RolesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();
  const canCreate = hasPermission(user, P.ROLES_ROLES_CREATE);
  const canEdit = hasPermission(user, P.ROLES_ROLES_EDIT);

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const result = await withPageAuth(() =>
    listRoles(user, {
      search,
      status: status === "all" ? undefined : status,
      page,
      pageSize: 20,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Define access roles and permission sets."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/roles/new">
                <Plus className="size-4" />
                Create role
              </Link>
            </Button>
          ) : null
        }
      />

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            { name: "search", label: "Search", type: "search", placeholder: "Name or code…" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState title="No roles found" description="Create a role to get started." />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Link href={`/roles/${role.id}`} className="font-medium text-accent hover:underline">
                        {role.name}
                      </Link>
                      {role.isSystem ? (
                        <span className="ml-2 text-xs text-muted-foreground">system</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{role.code}</TableCell>
                    <TableCell>{role._count.rolePermissions}</TableCell>
                    <TableCell>{role._count.userRoles}</TableCell>
                    <TableCell>
                      <StatusBadge status={role.isActive ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell>
                      <RoleRowActions
                        roleId={role.id}
                        isActive={role.isActive}
                        canEdit={canEdit}
                        canCreate={canCreate}
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
            basePath="/roles"
            searchParams={{ search, status }}
          />
        </div>
      )}
    </div>
  );
}
