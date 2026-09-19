"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as roles from "@/server/services/roles";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createRoleAction(input: {
  code: string;
  name: string;
  description?: string;
  permissionIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await roles.createRole(actor, input);
    revalidatePath("/roles");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateRoleAction(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await roles.updateRole(actor, id, input);
    revalidatePath("/roles");
    revalidatePath(`/roles/${id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await roles.deleteRole(actor, id);
    revalidatePath("/roles");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateRoleAction(
  id: string,
  newCode?: string,
  newName?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await roles.duplicateRole(actor, id, newCode, newName);
    revalidatePath("/roles");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function setRoleActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await roles.setRoleActive(actor, id, isActive);
    revalidatePath("/roles");
    revalidatePath(`/roles/${id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function assignPermissionsAction(
  roleId: string,
  permissionIds: string[],
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await roles.assignPermissions(actor, roleId, permissionIds);
    revalidatePath(`/roles/${roleId}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function assignUsersToRoleAction(
  roleId: string,
  userIds: string[],
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await roles.assignUsersToRole(actor, roleId, userIds);
    revalidatePath(`/roles/${roleId}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
