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
import { approveExpenseAction, approvePaymentAction } from "@/server/actions/finance";

export type BudgetRow = {
  id: string;
  fiscalYear: number;
  category: string;
  allocated: number;
  committed: number;
  spent: number;
  status: string;
  costCenter: string | null;
  department: string | null;
};

export type ExpenseRow = {
  id: string;
  expenseNumber: string;
  title: string;
  amount: number;
  category: string | null;
  status: string;
  createdAt: string;
};

export type PaymentRow = {
  id: string;
  requestNumber: string;
  title: string;
  amount: number;
  status: string;
  createdAt: string;
};

type Props = {
  budgets: BudgetRow[];
  expenses: ExpenseRow[];
  payments: PaymentRow[];
  canApproveExpense: boolean;
  canApprovePayment: boolean;
};

export function FinanceClient({
  budgets,
  expenses,
  payments,
  canApproveExpense,
  canApprovePayment,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function onExpense(id: string, approve: boolean) {
    setPendingId(id);
    const result = await approveExpenseAction(id, approve);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success(approve ? "Expense approved" : "Expense rejected");
    router.refresh();
  }

  async function onPayment(id: string) {
    setPendingId(id);
    const result = await approvePaymentAction(id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Payment approved");
    router.refresh();
  }

  const budgetColumns = React.useMemo<DataTableColumnDef<BudgetRow>[]>(
    () => [
      { accessorKey: "fiscalYear", header: "FY" },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "allocated",
        header: "Allocated",
        cell: ({ row }) => formatCurrency(row.original.allocated),
      },
      {
        accessorKey: "committed",
        header: "Committed",
        cell: ({ row }) => formatCurrency(row.original.committed),
      },
      {
        accessorKey: "spent",
        header: "Spent",
        cell: ({ row }) => formatCurrency(row.original.spent),
      },
      {
        id: "utilization",
        header: "Used",
        cell: ({ row }) => {
          const pct =
            row.original.allocated > 0
              ? (row.original.spent / row.original.allocated) * 100
              : 0;
          return `${formatNumber(pct, 0)}%`;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
    ],
    [],
  );

  const expenseColumns = React.useMemo<DataTableColumnDef<ExpenseRow>[]>(
    () => [
      { accessorKey: "expenseNumber", header: "Expense #" },
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          canApproveExpense && ["draft", "submitted", "pending"].includes(row.original.status) ? (
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pendingId === row.original.id}
                onClick={() => onExpense(row.original.id, true)}
              >
                <Check className="size-4 text-success" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pendingId === row.original.id}
                onClick={() => onExpense(row.original.id, false)}
              >
                <X className="size-4 text-destructive" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [canApproveExpense, pendingId],
  );

  const paymentColumns = React.useMemo<DataTableColumnDef<PaymentRow>[]>(
    () => [
      { accessorKey: "requestNumber", header: "Request #" },
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          canApprovePayment && !["approved", "paid", "rejected"].includes(row.original.status) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingId === row.original.id}
              onClick={() => onPayment(row.original.id)}
            >
              Approve
            </Button>
          ) : null,
      },
    ],
    [canApprovePayment, pendingId],
  );

  return (
    <Tabs defaultValue="budgets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="budgets">Budgets</TabsTrigger>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
        <TabsTrigger value="payments">Payment requests</TabsTrigger>
      </TabsList>
      <TabsContent value="budgets">
        <DataTable
          columns={budgetColumns}
          data={budgets}
          searchPlaceholder="Search budgets…"
          emptyTitle="No budgets"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="expenses">
        <DataTable
          columns={expenseColumns}
          data={expenses}
          searchPlaceholder="Search expenses…"
          emptyTitle="No expenses"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="payments">
        <DataTable
          columns={paymentColumns}
          data={payments}
          searchPlaceholder="Search payments…"
          emptyTitle="No payment requests"
          getRowId={(r) => r.id}
        />
      </TabsContent>
    </Tabs>
  );
}
