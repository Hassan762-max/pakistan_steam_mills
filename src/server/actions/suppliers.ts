"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import { createSupplier, deleteSupplier, updateSupplier } from "@/server/services/suppliers";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createSupplierAction(input: {
  code: string;
  name: string;
  legalName?: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createSupplier(user, input);
    revalidatePath("/suppliers");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateSupplierAction(
  id: string,
  input: {
    name?: string;
    status?: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    rating?: number | null;
    complianceNotes?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateSupplier(user, id, input);
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteSupplier(user, id);
    revalidatePath("/suppliers");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
