import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EntityStatus } from "@/components/ops/entity-status";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { P } from "@/lib/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import { getSupplier } from "@/server/services/suppliers";
import { AuthError } from "@/server/auth/service";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  if (!hasPermission(user, P.SUPPLIERS_SUPPLIERS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  let supplier;
  try {
    supplier = await getSupplier(user, id);
  } catch (e) {
    if (e instanceof AuthError) notFound();
    throw e;
  }

  const latestPerf = supplier.performance[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={`${supplier.code}${supplier.city ? ` · ${supplier.city}` : ""}`}
        breadcrumbs={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/suppliers">Suppliers</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{supplier.code}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        actions={<EntityStatus status={supplier.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Rating"
          value={supplier.rating != null ? formatNumber(supplier.rating, 1) : "—"}
        />
        <StatCard title="Purchase orders" value={formatNumber(supplier.purchaseOrders.length)} />
        <StatCard title="Contracts" value={formatNumber(supplier.contracts.length)} />
        <StatCard
          title="On-time delivery"
          value={
            latestPerf?.onTimeRate != null
              ? `${formatNumber(latestPerf.onTimeRate, 0)}%`
              : "—"
          }
          description={latestPerf ? `Period ${latestPerf.period}` : "No performance records"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {supplier.email ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {supplier.phone ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Contact: </span>
              {supplier.contactName ?? "—"}
              {supplier.contactEmail ? ` (${supplier.contactEmail})` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Address: </span>
              {supplier.address ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance history</CardTitle>
          </CardHeader>
          <CardContent>
            {supplier.performance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scored periods yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {supplier.performance.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-4 border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{p.period}</p>
                      <p className="text-muted-foreground">
                        Quality{" "}
                        {p.qualityScore != null ? formatNumber(p.qualityScore, 0) : "—"} · On-time{" "}
                        {p.onTimeRate != null ? `${formatNumber(p.onTimeRate, 0)}%` : "—"}
                      </p>
                    </div>
                    <span className="font-heading font-semibold">
                      {p.rating != null ? formatNumber(p.rating, 1) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent purchase orders</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders linked.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">PO #</th>
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{po.poNumber}</td>
                      <td className="py-2">{po.title}</td>
                      <td className="py-2">
                        <EntityStatus status={po.status} />
                      </td>
                      <td className="py-2">{formatCurrency(po.totalAmount)}</td>
                      <td className="py-2">{formatDate(po.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
