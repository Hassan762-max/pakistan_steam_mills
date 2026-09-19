import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthError } from "@/server/auth/service";
import { requirePageUser } from "@/lib/require-page-user";
import { getEmployee } from "@/server/services/employees";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Params = Promise<{ id: string }>;

export default async function EmployeeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requirePageUser();

  let employee;
  try {
    employee = await getEmployee(user, id);
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      const { redirect } = await import("next/navigation");
      redirect("/unauthorized");
    }
    if (error instanceof AuthError && error.code === "VALIDATION") notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.fullName}
        description={`${employee.employeeNumber} · ${employee.designation?.title ?? "No designation"}`}
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
                <BreadcrumbPage>{employee.fullName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      <StatusBadge status={(employee.employmentStatus as StatusBadgeStatus) || "inactive"} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leave">Leave balances</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Department" value={employee.department?.name ?? "—"} />
                <Row label="Designation" value={employee.designation?.title ?? "—"} />
                <Row label="Type" value={employee.employmentType} />
                <Row label="Grade" value={employee.grade ?? "—"} />
                <Row label="Joined" value={formatDate(employee.joiningDate)} />
                <Row label="Supervisor" value={employee.supervisor?.fullName ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Email" value={employee.email ?? "—"} />
                <Row label="Phone" value={employee.phone ?? "—"} />
                <Row label="CNIC" value={employee.cnic ?? "—"} />
                <Row label="City" value={employee.city ?? "—"} />
                <Row label="Address" value={employee.address ?? "—"} />
                <Row
                  label="System user"
                  value={
                    employee.user ? (
                      <Link href={`/users/${employee.user.id}`} className="text-accent hover:underline">
                        {employee.user.email}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave balances</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.leaveBalances.length === 0 ? (
                <EmptyState className="border-0 bg-transparent py-8" title="No leave balances" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Entitled</th>
                      <th className="pb-2">Used</th>
                      <th className="pb-2">Pending</th>
                      <th className="pb-2">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.leaveBalances.map((b) => (
                      <tr key={b.id} className="border-b border-border/50">
                        <td className="py-2">{b.leaveType.name}</td>
                        <td className="py-2">{b.entitled + b.carriedForward}</td>
                        <td className="py-2">{b.used}</td>
                        <td className="py-2">{b.pending}</td>
                        <td className="py-2">{b.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.documents.length === 0 ? (
                <EmptyState className="border-0 bg-transparent py-8" title="No documents" />
              ) : (
                <ul className="divide-y text-sm">
                  {employee.documents.map((doc) => (
                    <li key={doc.id} className="flex justify-between py-2">
                      <span>{doc.title}</span>
                      <span className="text-muted-foreground">{formatDateTime(doc.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct reports</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.subordinates.length === 0 ? (
                <EmptyState className="border-0 bg-transparent py-8" title="No direct reports" />
              ) : (
                <ul className="divide-y text-sm">
                  {employee.subordinates.map((s) => (
                    <li key={s.id} className="py-2">
                      <Link href={`/employees/${s.id}`} className="text-accent hover:underline">
                        {s.fullName}
                      </Link>
                      <span className="ml-2 text-muted-foreground">{s.employeeNumber}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
