"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as documents from "@/server/services/documents";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createDocumentAction(input: {
  title: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  sizeBytes?: number;
  category: string;
  accessLevel?: string;
  employeeId?: string;
  supplierId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await documents.createDocument(actor, input);
    revalidatePath("/documents");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function archiveDocumentAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await documents.deleteDocument(actor, id);
    revalidatePath("/documents");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
