"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import { actOnWorkflow } from "@/server/services/workflows";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function actOnWorkflowAction(
  instanceId: string,
  input: {
    action: "approve" | "reject" | "request_changes" | "comment" | "delegate";
    comments?: string;
    delegatedTo?: string;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await actOnWorkflow(user, instanceId, input);
    revalidatePath("/workflows");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
