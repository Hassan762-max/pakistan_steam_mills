"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as users from "@/server/services/users";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createUserAction(input: {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds?: string[];
  employeeId?: string;
  mustChangePassword?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireUser();
    const created = await users.createUser(actor, input);
    revalidatePath("/users");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateUserAction(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    employeeId?: string | null;
  },
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.updateUser(actor, id, input);
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setUserStatusAction(
  id: string,
  status: "active" | "inactive",
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.setUserStatus(actor, id, status);
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function softDeleteUserAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.softDeleteUser(actor, id);
    revalidatePath("/users");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function assignRolesAction(
  userId: string,
  roleIds: string[],
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.assignRoles(actor, userId, roleIds);
    revalidatePath(`/users/${userId}`);
    revalidatePath("/users");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function removeRoleAction(
  userId: string,
  roleId: string,
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.removeRole(actor, userId, roleId);
    revalidatePath(`/users/${userId}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.resetUserPassword(actor, userId, newPassword);
    revalidatePath(`/users/${userId}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function forceLogoutAction(userId: string): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await users.forceLogout(actor, userId);
    revalidatePath(`/users/${userId}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
