"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as leave from "@/server/services/leave";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createLeaveRequestAction(input: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await leave.createLeaveRequest(actor, {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      days: input.days,
      reason: input.reason,
    });
    revalidatePath("/leave");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function approveLeaveAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await leave.approveLeaveRequest(actor, id);
    revalidatePath("/leave");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function rejectLeaveAction(
  id: string,
  rejectionReason?: string,
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await leave.rejectLeaveRequest(actor, id, rejectionReason);
    revalidatePath("/leave");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
