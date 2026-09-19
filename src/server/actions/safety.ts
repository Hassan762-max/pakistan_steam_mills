"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  createIncident,
  createSafetyInspection,
  updateIncident,
} from "@/server/services/safety";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createIncidentAction(input: {
  incidentNumber: string;
  type: string;
  title: string;
  description?: string;
  severity?: string;
  location?: string;
  plantId?: string;
  occurredAt: string;
  injuredCount?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createIncident(user, {
      ...input,
      occurredAt: new Date(input.occurredAt),
    });
    revalidatePath("/safety");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateIncidentAction(
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
    await updateIncident(user, id, {
      ...input,
      closedAt: input.status === "closed" ? new Date() : undefined,
    });
    revalidatePath("/safety");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createSafetyInspectionAction(input: {
  inspectionNo: string;
  area: string;
  inspectorName?: string;
  scheduledAt?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createSafetyInspection(user, {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    });
    revalidatePath("/safety");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
