"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  approveExpense,
  approvePayment,
  createBudget,
  createExpense,
} from "@/server/services/finance";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createBudgetAction(input: {
  fiscalYear: number;
  category: string;
  allocated: number;
  costCenterId?: string;
  departmentId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createBudget(user, input);
    revalidatePath("/finance");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function createExpenseAction(input: {
  expenseNumber: string;
  title: string;
  amount: number;
  category?: string;
  costCenterId?: string;
  incurredAt?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createExpense(user, {
      ...input,
      incurredAt: input.incurredAt ? new Date(input.incurredAt) : undefined,
    });
    revalidatePath("/finance");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function approveExpenseAction(id: string, approve: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await approveExpense(user, id, approve);
    revalidatePath("/finance");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function approvePaymentAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await approvePayment(user, id);
    revalidatePath("/finance");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
