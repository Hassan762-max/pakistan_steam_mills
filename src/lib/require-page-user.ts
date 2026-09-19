import { redirect } from "next/navigation";
import { AuthError, requireUser, type AuthUser } from "@/server/auth/service";
import { handlePageAuthError } from "@/lib/page-auth";

/** requireUser() that redirects instead of throwing for page routes. */
export async function requirePageUser(): Promise<AuthUser> {
  try {
    return await requireUser();
  } catch (error) {
    handlePageAuthError(error);
  }
}

export { AuthError, handlePageAuthError };
