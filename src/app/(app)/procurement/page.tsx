import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import {
  listGoodsReceipts,
  listPurchaseOrders,
  listPurchaseRequests,
  listRfqs,
} from "@/server/services/procurement";
import { ProcurementClient } from "./procurement-client";

export default async function ProcurementPage() {
  const user = await requirePageUser();
  if (
    !hasPermission(user, P.PROCUREMENT_REQUESTS_VIEW) &&
    !hasPermission(user, P.PROCUREMENT_ORDERS_VIEW)
  ) {
    redirect("/dashboard");
  }

  const [requests, rfqs, orders, receipts] = await Promise.all([
    hasPermission(user, P.PROCUREMENT_REQUESTS_VIEW)
      ? listPurchaseRequests(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.PROCUREMENT_RFQS_VIEW)
      ? listRfqs(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.PROCUREMENT_ORDERS_VIEW)
      ? listPurchaseOrders(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.PROCUREMENT_RECEIPTS_VIEW)
      ? listGoodsReceipts(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const pendingApprovals = requests.items.filter((r) =>
    ["draft", "submitted"].includes(r.status),
  ).length;
  const openPoValue = orders.items
    .filter((o) => !["closed", "cancelled"].includes(o.status))
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Purchase requests, RFQs, orders, and goods receipts in one workspace."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Pending approvals"
          value={formatNumber(pendingApprovals)}
          icon="FileText"
        />
        <StatCard title="Open POs" value={formatNumber(orders.items.length)} icon="ShoppingCart" />
        <StatCard title="Open PO value" value={formatCurrency(openPoValue)} icon="Truck" />
      </div>

      <ProcurementClient
        permissions={{
          canApproveRequest: hasPermission(user, P.PROCUREMENT_REQUESTS_APPROVE),
          canRejectRequest: hasPermission(user, P.PROCUREMENT_REQUESTS_REJECT),
          canApprovePo: hasPermission(user, P.PROCUREMENT_ORDERS_APPROVE),
        }}
        requests={requests.items.map((r) => ({
          id: r.id,
          requestNumber: r.requestNumber,
          title: r.title,
          status: r.status,
          priority: r.priority,
          totalEstimate: r.totalEstimate,
          itemCount: r.items.length,
          createdAt: r.createdAt.toISOString(),
        }))}
        rfqs={rfqs.items.map((r) => ({
          id: r.id,
          rfqNumber: r.rfqNumber,
          title: r.title,
          status: r.status,
          supplierName: r.supplier?.name ?? null,
          quotationCount: r.quotations.length,
          dueDate: r.dueDate?.toISOString() ?? null,
        }))}
        orders={orders.items.map((o) => ({
          id: o.id,
          poNumber: o.poNumber,
          title: o.title,
          status: o.status,
          supplierName: o.supplier.name,
          totalAmount: o.totalAmount,
          expectedDate: o.expectedDate?.toISOString() ?? null,
        }))}
        receipts={receipts.items.map((g) => ({
          id: g.id,
          grnNumber: g.grnNumber,
          poNumber: g.purchaseOrder.poNumber,
          status: g.status,
          itemCount: g.items.length,
          createdAt: g.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
