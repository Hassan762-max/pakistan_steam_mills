import { AuthError } from "@/server/auth/service";

export type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

export function fail<T = unknown>(error: unknown): ActionResult<T> {
  if (error instanceof AuthError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "An unexpected error occurred" };
}

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}
