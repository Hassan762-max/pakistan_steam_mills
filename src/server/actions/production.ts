"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  createProductionOrder,
  createProductionSchedule,
  updateProductionOrder,
} from "@/server/services/production";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createProductionOrderAction(input: {
  orderNumber: string;
  productCode: string;
  productName: string;
  productionLineId?: string;
  plantId?: string;
  targetQuantity: number;
  unit?: string;
  priority?: string;
  plannedStart?: string;
  plannedEnd?: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createProductionOrder(user, {
      ...input,
      plannedStart: input.plannedStart ? new Date(input.plannedStart) : undefined,
      plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : undefined,
    });
    revalidatePath("/production");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateProductionOrderAction(
  id: string,
  input: {
    targetQuantity?: number;
    actualQuantity?: number;
    status?: string;
    priority?: string;
    plannedStart?: string | null;
    plannedEnd?: string | null;
    efficiency?: number | null;
    notes?: string | null;
    productionLineId?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateProductionOrder(user, id, {
      ...input,
      plannedStart:
        input.plannedStart === undefined
          ? undefined
          : input.plannedStart
            ? new Date(input.plannedStart)
            : null,
      plannedEnd:
        input.plannedEnd === undefined
          ? undefined
          : input.plannedEnd
            ? new Date(input.plannedEnd)
            : null,
    });
    revalidatePath("/production");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createProductionScheduleAction(input: {
  productionOrderId: string;
  productionLineId: string;
  shiftId?: string;
  scheduledDate: string;
  targetQuantity: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createProductionSchedule(user, {
      ...input,
      scheduledDate: new Date(input.scheduledDate),
    });
    revalidatePath("/production");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
