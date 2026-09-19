import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import {
  listBudgets,
  listExpenses,
  listPaymentRequests,
} from "@/server/services/finance";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const user = await requirePageUser();
  if (
    !hasPermission(user, P.FINANCE_BUDGETS_VIEW) &&
    !hasPermission(user, P.FINANCE_EXPENSES_VIEW)
  ) {
    redirect("/dashboard");
  }

  const [budgets, expenses, payments] = await Promise.all([
    hasPermission(user, P.FINANCE_BUDGETS_VIEW)
      ? listBudgets(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.FINANCE_EXPENSES_VIEW)
      ? listExpenses(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
    hasPermission(user, P.FINANCE_PAYMENTS_VIEW)
      ? listPaymentRequests(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const allocated = budgets.items.reduce((s, b) => s + b.allocated, 0);
  const spent = budgets.items.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Budgets, expense approvals, and payment requests."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Allocated" value={formatCurrency(allocated)} icon="Wallet" />
        <StatCard title="Spent" value={formatCurrency(spent)} />
        <StatCard title="Pending expenses" value={formatNumber(
          expenses.items.filter((e) => ["draft", "submitted", "pending"].includes(e.status)).length,
        )} />
      </div>
      <FinanceClient
        canApproveExpense={hasPermission(user, P.FINANCE_EXPENSES_APPROVE)}
        canApprovePayment={hasPermission(user, P.FINANCE_PAYMENTS_APPROVE)}
        budgets={budgets.items.map((b) => ({
          id: b.id,
          fiscalYear: b.fiscalYear,
          category: b.category,
          allocated: b.allocated,
          committed: b.committed,
          spent: b.spent,
          status: b.status,
          costCenter: b.costCenter?.name ?? null,
          department: b.department?.name ?? null,
        }))}
        expenses={expenses.items.map((e) => ({
          id: e.id,
          expenseNumber: e.expenseNumber,
          title: e.title,
          amount: e.amount,
          category: e.category,
          status: e.status,
          createdAt: e.createdAt.toISOString(),
        }))}
        payments={payments.items.map((p) => ({
          id: p.id,
          requestNumber: p.requestNumber,
          title: p.title,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
