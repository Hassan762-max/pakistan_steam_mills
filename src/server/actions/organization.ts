"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as org from "@/server/services/organization";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createPlantAction(input: {
  organizationId: string;
  code: string;
  name: string;
  location?: string;
  city?: string;
  capacityTons?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await org.createPlant(actor, input);
    revalidatePath("/plants");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function createDepartmentAction(input: {
  code: string;
  name: string;
  description?: string;
  divisionId?: string;
  plantId?: string;
  costCenter?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await org.createDepartment(actor, input);
    revalidatePath("/departments");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function createDesignationAction(input: {
  code: string;
  title: string;
  grade?: string;
  level?: number;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await org.createDesignation(actor, input);
    revalidatePath("/designations");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
