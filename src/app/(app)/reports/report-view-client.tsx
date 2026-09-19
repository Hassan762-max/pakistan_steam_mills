"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportToCsv } from "@/lib/export-csv";
import { formatCurrency, formatNumber } from "@/lib/utils";

type ReportPayload = Record<string, unknown>;

type Props = {
  reportKey: string;
  label: string;
  canExport: boolean;
  data: ReportPayload;
};

function flattenRows(reportKey: string, data: ReportPayload): Record<string, unknown>[] {
  switch (reportKey) {
    case "employee": {
      const byDept = (data.byDepartment as Array<{ department: { name?: string } | null; count: number }>) ?? [];
      const byStatus = (data.byStatus as Array<{ status: string; count: number }>) ?? [];
      return [
        ...byDept.map((r) => ({
          section: "department",
          key: r.department?.name ?? "Unassigned",
          count: r.count,
        })),
        ...byStatus.map((r) => ({ section: "status", key: r.status, count: r.count })),
      ];
    }
    case "production": {
      const byStatus =
        (data.byStatus as Array<{
          status: string;
          _count: { id: number };
          _sum: { targetQuantity: number | null; actualQuantity: number | null };
        }>) ?? [];
      return byStatus.map((r) => ({
        status: r.status,
        orders: r._count.id,
        target: r._sum.targetQuantity ?? 0,
        actual: r._sum.actualQuantity ?? 0,
      }));
    }
    case "inventory": {
      const low = (data.lowStock as Array<Record<string, unknown>>) ?? [];
      const byCat = (data.byCategory as Array<{ category: string; count: number }>) ?? [];
      return [
        ...low.map((r) => ({ section: "low_stock", ...r })),
        ...byCat.map((r) => ({ section: "category", category: r.category, count: r.count })),
      ];
    }
    case "procurement": {
      const requests = (data.requests as Array<{ status: string; _count: { id: number } }>) ?? [];
      const orders =
        (data.orders as Array<{
          status: string;
          _count: { id: number };
          _sum: { totalAmount: number | null };
        }>) ?? [];
      return [
        ...requests.map((r) => ({
          section: "request",
          status: r.status,
          count: r._count.id,
        })),
        ...orders.map((r) => ({
          section: "order",
          status: r.status,
          count: r._count.id,
          amount: r._sum.totalAmount ?? 0,
        })),
      ];
    }
    case "maintenance": {
      const wo = (data.workOrders as Array<{ status: string; _count: { id: number } }>) ?? [];
      const eq = (data.equipment as Array<{ status: string; _count: { id: number } }>) ?? [];
      return [
        ...wo.map((r) => ({ section: "work_order", status: r.status, count: r._count.id })),
        ...eq.map((r) => ({ section: "equipment", status: r.status, count: r._count.id })),
      ];
    }
    case "quality": {
      const insp = (data.inspections as Array<{ status: string; _count: { id: number } }>) ?? [];
      const ncrs = (data.ncrs as Array<{ status: string; _count: { id: number } }>) ?? [];
      return [
        ...insp.map((r) => ({ section: "inspection", status: r.status, count: r._count.id })),
        ...ncrs.map((r) => ({ section: "ncr", status: r.status, count: r._count.id })),
      ];
    }
    case "safety": {
      const byType = (data.byType as Array<{ type: string; _count: { id: number } }>) ?? [];
      const byStatus = (data.byStatus as Array<{ status: string; _count: { id: number } }>) ?? [];
      return [
        ...byType.map((r) => ({ section: "type", key: r.type, count: r._count.id })),
        ...byStatus.map((r) => ({ section: "status", key: r.status, count: r._count.id })),
      ];
    }
    case "attendance": {
      const byStatus =
        (data.byStatus as Array<{
          status: string;
          _count: { id: number };
          _sum: { lateMinutes: number | null; overtimeMinutes: number | null };
        }>) ?? [];
      return byStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
        lateMinutes: r._sum.lateMinutes ?? 0,
        overtimeMinutes: r._sum.overtimeMinutes ?? 0,
      }));
    }
    case "audit": {
      const byModule = (data.byModule as Array<{ module: string; _count: { id: number } }>) ?? [];
      const byAction = (data.byAction as Array<{ action: string; _count: { id: number } }>) ?? [];
      return [
        ...byModule.map((r) => ({ section: "module", key: r.module, count: r._count.id })),
        ...byAction.map((r) => ({ section: "action", key: r.action, count: r._count.id })),
      ];
    }
    default:
      return [data];
  }
}

function SummaryCards({ reportKey, data }: { reportKey: string; data: ReportPayload }) {
  if (reportKey === "employee") {
    return (
      <p className="text-sm text-muted-foreground">
        Total employees: <strong className="text-foreground">{formatNumber(data.total as number)}</strong>
      </p>
    );
  }
  if (reportKey === "production") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl font-semibold">
            {formatNumber(data.orderCount as number)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg efficiency</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl font-semibold">
            {formatNumber(data.avgEfficiency as number, 1)}%
          </CardContent>
        </Card>
      </div>
    );
  }
  if (reportKey === "inventory") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl font-semibold">
            {formatNumber(data.totalItems as number)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low stock</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl font-semibold">
            {formatNumber(data.lowStockCount as number)}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (reportKey === "procurement") {
    return (
      <p className="text-sm text-muted-foreground">
        Total spend:{" "}
        <strong className="text-foreground">{formatCurrency(data.totalSpend as number)}</strong>
      </p>
    );
  }
  return null;
}

export function ReportViewClient({ reportKey, label, canExport, data }: Props) {
  const rows = React.useMemo(() => flattenRows(reportKey, data), [reportKey, data]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canExport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportToCsv(`${reportKey}-report`, rows)}
            disabled={!rows.length}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        ) : null}
      </div>
      <SummaryCards reportKey={reportKey} data={data} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{label} detail</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows to display.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {Object.keys(rows[0]!).map((k) => (
                      <th key={k} className="pb-2 pr-4 font-medium capitalize">
                        {k.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      {Object.values(row).map((v, i) => (
                        <td key={i} className="py-2 pr-4">
                          {v == null ? "—" : String(v)}
                        </td>
                      ))}
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
