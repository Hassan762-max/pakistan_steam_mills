"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as attendance from "@/server/services/attendance";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function recordAttendanceAction(input: {
  employeeId: string;
  date: string;
  shiftId?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  lateMinutes?: number;
  overtimeMinutes?: number;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await attendance.recordAttendance(actor, {
      employeeId: input.employeeId,
      date: new Date(input.date),
      shiftId: input.shiftId,
      checkIn: input.checkIn ? new Date(input.checkIn) : undefined,
      checkOut: input.checkOut ? new Date(input.checkOut) : undefined,
      status: input.status,
      lateMinutes: input.lateMinutes,
      overtimeMinutes: input.overtimeMinutes,
      notes: input.notes,
    });
    revalidatePath("/attendance");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
