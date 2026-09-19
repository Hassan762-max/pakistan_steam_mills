import type { Prisma } from "@prisma/client";
import type { AuthUser } from "@/server/auth/service";
import { writeAuditLog } from "@/server/audit/service";

export type ListParams = {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  status?: string;
  [key: string]: unknown;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function normalizePagination(params: ListParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;
  const sortDir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  return { page, pageSize, skip, sortDir };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function auditMutation(
  user: AuthUser,
  input: {
    action: string;
    module: string;
    resource: string;
    resourceId?: string | null;
    description?: string;
    beforeValue?: unknown;
    afterValue?: unknown;
  },
) {
  return writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    ...input,
  });
}

export function containsSearch(fields: string[], search?: string): Prisma.StringFilter | undefined {
  if (!search?.trim()) return undefined;
  return { contains: search.trim() };
}

export function orContains(fields: string[], search?: string) {
  const q = search?.trim();
  if (!q) return undefined;
  return fields.map((field) => ({ [field]: { contains: q } }));
}
