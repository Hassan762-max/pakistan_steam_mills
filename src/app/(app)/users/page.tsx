import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listUsers } from "@/server/services/users";
import { listRoles } from "@/server/services/roles";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { formatDateTime } from "@/lib/utils";
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

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();
  const canCreate = hasPermission(user, P.USERS_USERS_CREATE);

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const roleCode = typeof sp.role === "string" ? sp.role : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const result = await withPageAuth(() =>
    listUsers(user, {
      search,
      status: status === "all" ? undefined : status,
      roleCode: roleCode === "all" ? undefined : roleCode,
      page,
      pageSize: 20,
    }),
  );

  const awaitingRole = await withPageAuth(() =>
    listUsers(user, { status: "pending_approval", pageSize: 1 }),
  );

  let roleOptions: { value: string; label: string }[] = [];
  if (hasPermission(user, P.ROLES_ROLES_VIEW)) {
    try {
      const rolesResult = await listRoles(user, { pageSize: 100, status: "active" });
      roleOptions = rolesResult.items.map((r) => ({ value: r.code, label: r.name }));
    } catch {
      roleOptions = [];
    }
  }

  const filterParams = {
    search,
    status,
    role: roleCode,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system accounts, roles, and access status."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/users/new">
                <Plus className="size-4" />
                Create user
              </Link>
            </Button>
          ) : null
        }
      />

      {awaitingRole.total > 0 ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            {awaitingRole.total} user{awaitingRole.total === 1 ? "" : "s"} awaiting role assignment
          </p>
          <p className="mt-1 text-muted-foreground">
            Self-registered users need a role before they can access modules.{" "}
            <Link href="/users?status=pending_approval" className="font-medium text-accent hover:underline">
              Review awaiting users
            </Link>
          </p>
        </div>
      ) : null}

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            { name: "search", label: "Search", type: "search", placeholder: "Name, email, username…" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "pending", label: "Pending verification" },
                { value: "pending_approval", label: "Awaiting role" },
                { value: "locked", label: "Locked" },
              ],
            },
            {
              name: "role",
              label: "Role",
              type: "select",
              options: roleOptions,
            },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try adjusting filters or create a new user account."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/users/new">Create user</Link>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/users/${u.id}`} className="font-medium text-accent hover:underline">
                        {u.firstName} {u.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles.map((ur) => (
                          <span
                            key={ur.role.id}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={(u.status as StatusBadgeStatus) || "inactive"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(u.lastLoginAt)}
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
            basePath="/users"
            searchParams={filterParams}
          />
        </div>
      )}
    </div>
  );
}
