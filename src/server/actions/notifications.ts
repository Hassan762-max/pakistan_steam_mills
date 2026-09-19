"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/services/notifications";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationRead(user, id);
    revalidatePath("/notifications");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markAllNotificationsRead(user);
    revalidatePath("/notifications");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
