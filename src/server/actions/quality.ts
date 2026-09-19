"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  createInspection,
  createNcr,
  updateInspection,
  updateNcr,
} from "@/server/services/quality";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createInspectionAction(input: {
  inspectionNumber: string;
  type: string;
  productCode?: string;
  productName?: string;
  batchNumber?: string;
  inspectorName?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createInspection(user, input);
    revalidatePath("/quality");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateInspectionAction(
  id: string,
  input: {
    status?: string;
    resultSummary?: string | null;
    inspectorName?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateInspection(user, id, {
      ...input,
      inspectedAt: input.status ? new Date() : undefined,
    });
    revalidatePath("/quality");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createNcrAction(input: {
  ncrNumber: string;
  title: string;
  description?: string;
  severity?: string;
  inspectionId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createNcr(user, input);
    revalidatePath("/quality");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateNcrAction(
  id: string,
  input: {
    status?: string;
    severity?: string;
    correctiveAction?: string | null;
    title?: string;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateNcr(user, id, {
      ...input,
      closedAt: input.status === "closed" ? new Date() : undefined,
    });
    revalidatePath("/quality");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
