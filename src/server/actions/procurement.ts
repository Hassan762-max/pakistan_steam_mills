"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  createGoodsReceipt,
  createPurchaseOrder,
  createPurchaseRequest,
  createRfq,
  setPurchaseRequestStatus,
  updatePurchaseOrder,
} from "@/server/services/procurement";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function setPurchaseRequestStatusAction(
  id: string,
  status: "submitted" | "approved" | "rejected" | "converted",
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setPurchaseRequestStatus(user, id, status);
    revalidatePath("/procurement");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createPurchaseRequestAction(input: {
  requestNumber: string;
  title: string;
  priority?: string;
  justification?: string;
  requiredDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    estimatedUnitCost?: number;
  }>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createPurchaseRequest(user, {
      ...input,
      requiredDate: input.requiredDate ? new Date(input.requiredDate) : undefined,
    });
    revalidatePath("/procurement");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function createRfqAction(input: {
  rfqNumber: string;
  title: string;
  purchaseRequestId?: string;
  supplierId?: string;
  dueDate?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createRfq(user, {
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });
    revalidatePath("/procurement");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function createPurchaseOrderAction(input: {
  poNumber: string;
  supplierId: string;
  title: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createPurchaseOrder(user, {
      ...input,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
    });
    revalidatePath("/procurement");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updatePurchaseOrderAction(
  id: string,
  input: { status?: string; notes?: string | null; expectedDate?: string | null },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updatePurchaseOrder(user, id, {
      status: input.status,
      notes: input.notes,
      expectedDate:
        input.expectedDate === undefined
          ? undefined
          : input.expectedDate
            ? new Date(input.expectedDate)
            : null,
    });
    revalidatePath("/procurement");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createGoodsReceiptAction(input: {
  grnNumber: string;
  purchaseOrderId: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    batchNumber?: string;
  }>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createGoodsReceipt(user, input);
    revalidatePath("/procurement");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
