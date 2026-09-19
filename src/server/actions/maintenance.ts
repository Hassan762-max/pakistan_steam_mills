"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  assignWorkOrder,
  createEquipment,
  createWorkOrder,
  updateWorkOrder,
} from "@/server/services/maintenance";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createWorkOrderAction(input: {
  workOrderNumber: string;
  equipmentId: string;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createWorkOrder(user, {
      ...input,
      scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : undefined,
      scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : undefined,
    });
    revalidatePath("/maintenance");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateWorkOrderAction(
  id: string,
  input: {
    status?: string;
    priority?: string;
    assignedTo?: string | null;
    title?: string;
    description?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateWorkOrder(user, id, input);
    revalidatePath("/maintenance");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function assignWorkOrderAction(id: string, assignedTo: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assignWorkOrder(user, id, assignedTo);
    revalidatePath("/maintenance");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createEquipmentAction(input: {
  assetTag: string;
  name: string;
  category?: string;
  plantId?: string;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  criticality?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createEquipment(user, input);
    revalidatePath("/maintenance");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
