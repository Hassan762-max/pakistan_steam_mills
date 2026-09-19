import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listBudgets(user: AuthUser, params: ListParams & { fiscalYear?: number } = {}) {
  await requirePermission(user, P.FINANCE_BUDGETS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.fiscalYear ? { fiscalYear: params.fiscalYear } : {}),
    ...(params.status ? { status: params.status } : {}),
  };
  const [items, total] = await Promise.all([
    db.budget.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { fiscalYear: "desc" },
      include: { costCenter: true, department: true },
    }),
    db.budget.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createBudget(
  user: AuthUser,
  input: {
    fiscalYear: number;
    category: string;
    allocated: number;
    costCenterId?: string;
    departmentId?: string;
  },
) {
  await requirePermission(user, P.FINANCE_BUDGETS_CREATE);
  const created = await db.budget.create({ data: { ...input, status: "active" } });
  await auditMutation(user, {
    action: "create",
    module: "finance",
    resource: "budgets",
    resourceId: created.id,
  });
  return created;
}

export async function updateBudget(
  user: AuthUser,
  id: string,
  input: Partial<{ allocated: number; committed: number; spent: number; status: string }>,
) {
  await requirePermission(user, P.FINANCE_BUDGETS_EDIT);
  const updated = await db.budget.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "finance",
    resource: "budgets",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listExpenses(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.FINANCE_EXPENSES_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(search
      ? { OR: [{ expenseNumber: { contains: search } }, { title: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.expense.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: { costCenter: true },
    }),
    db.expense.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function createExpense(
  user: AuthUser,
  input: {
    expenseNumber: string;
    title: string;
    amount: number;
    category?: string;
    costCenterId?: string;
    incurredAt?: Date;
  },
) {
  await requirePermission(user, P.FINANCE_EXPENSES_CREATE);
  const created = await db.expense.create({
    data: {
      ...input,
      status: "draft",
      requestedById: user.id,
    },
  });
  await auditMutation(user, {
    action: "create",
    module: "finance",
    resource: "expenses",
    resourceId: created.id,
  });
  return created;
}

export async function approveExpense(user: AuthUser, id: string, approve: boolean) {
  await requirePermission(user, P.FINANCE_EXPENSES_APPROVE);
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) throw new AuthError("VALIDATION", "Expense not found");

  const updated = await db.expense.update({
    where: { id },
    data: {
      status: approve ? "approved" : "rejected",
      approvedById: approve ? user.id : null,
    },
  });
  await auditMutation(user, {
    action: approve ? "approve" : "reject",
    module: "finance",
    resource: "expenses",
    resourceId: id,
  });
  return updated;
}

export async function listPaymentRequests(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.FINANCE_PAYMENTS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? { OR: [{ requestNumber: { contains: params.search } }, { title: { contains: params.search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.paymentRequest.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    db.paymentRequest.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function approvePayment(user: AuthUser, id: string) {
  await requirePermission(user, P.FINANCE_PAYMENTS_APPROVE);
  const updated = await db.paymentRequest.update({
    where: { id },
    data: { status: "approved", approvedAt: new Date() },
  });
  await auditMutation(user, {
    action: "approve",
    module: "finance",
    resource: "payments",
    resourceId: id,
  });
  return updated;
}
