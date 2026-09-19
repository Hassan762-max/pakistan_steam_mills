"use server";

import {
  changePassword,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  signup,
  verifyEmail,
  AuthError,
  requireUser,
} from "@/server/auth/service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "@/lib/validators/auth";

export type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

function fail<T = unknown>(error: unknown): ActionResult<T> {
  if (error instanceof AuthError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "An unexpected error occurred" };
}

export async function loginAction(
  input: unknown,
): Promise<
  ActionResult<{
    userId: string;
    mustChangePassword: boolean;
    status: string;
    awaitingRoleAssignment: boolean;
  }>
> {
  try {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = await login(parsed.data.emailOrUsername, parsed.data.password);
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function signupAction(input: unknown): Promise<ActionResult<{ userId: string; verificationToken: string }>> {
  try {
    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { confirmPassword: _, ...rest } = parsed.data;
    const data = await signup({
      ...rest,
      phone: rest.phone || undefined,
    });
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    await logout();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Form-friendly sign-out that redirects to login */
export async function signOutAction() {
  await logout();
  const { redirect } = await import("next/navigation");
  redirect("/login");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<{ token: string | null }>> {
  try {
    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = await requestPasswordReset(parsed.data.email);
    return { ok: true, data: { token: data.token } };
  } catch (error) {
    return fail(error);
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await resetPassword(parsed.data.token, parsed.data.password);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyEmailAction(input: unknown): Promise<ActionResult<{ userId: string }>> {
  try {
    const parsed = verifyEmailSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = await verifyEmail(parsed.data.token);
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
