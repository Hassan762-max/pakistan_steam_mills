import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import { listSuppliers } from "@/server/services/suppliers";
import { SuppliersClient } from "./suppliers-client";

export default async function SuppliersPage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.SUPPLIERS_SUPPLIERS_VIEW)) redirect("/dashboard");

  const result = await listSuppliers(user, { pageSize: 100 });
  const active = result.items.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Vendor master data, ratings, and commercial history."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Total suppliers" value={formatNumber(result.total)} icon="Truck" />
        <StatCard title="Active" value={formatNumber(active)} description="Eligible for RFQs" />
      </div>
      <SuppliersClient
        canCreate={hasPermission(user, P.SUPPLIERS_SUPPLIERS_CREATE)}
        suppliers={result.items.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          category: s.category,
          city: s.city,
          status: s.status,
          rating: s.rating,
          poCount: s._count.purchaseOrders,
          contractCount: s._count.contracts,
        }))}
      />
    </div>
  );
}
