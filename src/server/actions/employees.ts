"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as employees from "@/server/services/employees";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createEmployeeAction(input: {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  plantId?: string;
  supervisorId?: string;
  employmentType?: string;
  grade?: string;
  joiningDate?: string;
  cnic?: string;
  gender?: string;
  city?: string;
  address?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await employees.createEmployee(actor, {
      ...input,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
    });
    revalidatePath("/employees");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateEmployeeAction(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
    plantId?: string | null;
    supervisorId?: string | null;
    employmentType?: string;
    employmentStatus?: string;
    grade?: string | null;
    city?: string | null;
    address?: string | null;
    endDate?: string | null;
  },
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await employees.updateEmployee(actor, id, {
      ...input,
      endDate:
        input.endDate === undefined
          ? undefined
          : input.endDate
            ? new Date(input.endDate)
            : null,
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
