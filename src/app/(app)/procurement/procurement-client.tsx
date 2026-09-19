"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import type { DataTableColumnDef } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { EntityStatus } from "@/components/ops/entity-status";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  setPurchaseRequestStatusAction,
  updatePurchaseOrderAction,
} from "@/server/actions/procurement";

export type RequestRow = {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  priority: string;
  totalEstimate: number | null;
  itemCount: number;
  createdAt: string;
};

export type RfqRow = {
  id: string;
  rfqNumber: string;
  title: string;
  status: string;
  supplierName: string | null;
  quotationCount: number;
  dueDate: string | null;
};

export type PoRow = {
  id: string;
  poNumber: string;
  title: string;
  status: string;
  supplierName: string;
  totalAmount: number;
  expectedDate: string | null;
};

export type GrnRow = {
  id: string;
  grnNumber: string;
  poNumber: string;
  status: string;
  itemCount: number;
  createdAt: string;
};

type Permissions = {
  canApproveRequest: boolean;
  canRejectRequest: boolean;
  canApprovePo: boolean;
};

type Props = {
  requests: RequestRow[];
  rfqs: RfqRow[];
  orders: PoRow[];
  receipts: GrnRow[];
  permissions: Permissions;
};

export function ProcurementClient({ requests, rfqs, orders, receipts, permissions }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function actRequest(id: string, status: "approved" | "rejected") {
    setPendingId(id);
    const result = await setPurchaseRequestStatusAction(id, status);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Action failed");
      return;
    }
    toast.success(status === "approved" ? "Request approved" : "Request rejected");
    router.refresh();
  }

  async function issuePo(id: string) {
    setPendingId(id);
    const result = await updatePurchaseOrderAction(id, { status: "issued" });
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Failed to issue PO");
      return;
    }
    toast.success("Purchase order issued");
    router.refresh();
  }

  const requestColumns = React.useMemo<DataTableColumnDef<RequestRow>[]>(
    () => [
      { accessorKey: "requestNumber", header: "PR #" },
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "priority", header: "Priority" },
      {
        accessorKey: "totalEstimate",
        header: "Estimate",
        cell: ({ row }) => formatCurrency(row.original.totalEstimate),
      },
      { accessorKey: "itemCount", header: "Lines" },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const canAct =
            ["draft", "submitted"].includes(row.original.status) &&
            (permissions.canApproveRequest || permissions.canRejectRequest);
          if (!canAct) return null;
          return (
            <div className="flex gap-1">
              {permissions.canApproveRequest ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={pendingId === row.original.id}
                  onClick={() => actRequest(row.original.id, "approved")}
                  aria-label="Approve"
                >
                  <Check className="size-4 text-success" />
                </Button>
              ) : null}
              {permissions.canRejectRequest ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={pendingId === row.original.id}
                  onClick={() => actRequest(row.original.id, "rejected")}
                  aria-label="Reject"
                >
                  <X className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [permissions, pendingId],
  );

  const rfqColumns = React.useMemo<DataTableColumnDef<RfqRow>[]>(
    () => [
      { accessorKey: "rfqNumber", header: "RFQ #" },
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "supplierName",
        header: "Supplier",
        cell: ({ row }) => row.original.supplierName ?? "—",
      },
      { accessorKey: "quotationCount", header: "Quotes" },
      {
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ row }) => formatDate(row.original.dueDate),
      },
    ],
    [],
  );

  const poColumns = React.useMemo<DataTableColumnDef<PoRow>[]>(
    () => [
      { accessorKey: "poNumber", header: "PO #" },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "supplierName", header: "Supplier" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.totalAmount),
      },
      {
        accessorKey: "expectedDate",
        header: "Expected",
        cell: ({ row }) => formatDate(row.original.expectedDate),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          permissions.canApprovePo && row.original.status === "draft" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingId === row.original.id}
              onClick={() => issuePo(row.original.id)}
            >
              Issue
            </Button>
          ) : null,
      },
    ],
    [permissions.canApprovePo, pendingId],
  );

  const grnColumns = React.useMemo<DataTableColumnDef<GrnRow>[]>(
    () => [
      { accessorKey: "grnNumber", header: "GRN #" },
      { accessorKey: "poNumber", header: "PO #" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "itemCount", header: "Lines" },
      {
        accessorKey: "createdAt",
        header: "Received",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue="requests" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap">
        <TabsTrigger value="requests">Requests ({formatNumber(requests.length)})</TabsTrigger>
        <TabsTrigger value="rfqs">RFQs ({formatNumber(rfqs.length)})</TabsTrigger>
        <TabsTrigger value="orders">Purchase orders</TabsTrigger>
        <TabsTrigger value="receipts">Goods receipts</TabsTrigger>
      </TabsList>
      <TabsContent value="requests">
        <DataTable
          columns={requestColumns}
          data={requests}
          searchPlaceholder="Search requests…"
          emptyTitle="No purchase requests"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="rfqs">
        <DataTable
          columns={rfqColumns}
          data={rfqs}
          searchPlaceholder="Search RFQs…"
          emptyTitle="No RFQs"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="orders">
        <DataTable
          columns={poColumns}
          data={orders}
          searchPlaceholder="Search POs…"
          emptyTitle="No purchase orders"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="receipts">
        <DataTable
          columns={grnColumns}
          data={receipts}
          searchPlaceholder="Search receipts…"
          emptyTitle="No goods receipts"
          getRowId={(r) => r.id}
        />
      </TabsContent>
    </Tabs>
  );
}
