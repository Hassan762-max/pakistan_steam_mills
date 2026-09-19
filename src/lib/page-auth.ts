import { redirect } from "next/navigation";
import { AuthError } from "@/server/auth/service";

/** Redirect when a service/page throws AuthError for authz/authn. */
export function handlePageAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    if (error.code === "UNAUTHORIZED") {
      redirect("/unauthorized");
    }
    if (error.code === "UNAUTHENTICATED" || error.code === "LOCKED") {
      redirect(error.code === "LOCKED" ? "/account-locked" : "/login");
    }
    if (error.code === "UNVERIFIED") {
      redirect("/verify-account");
    }
  }
  throw error;
}

export async function withPageAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handlePageAuthError(error);
  }
}
