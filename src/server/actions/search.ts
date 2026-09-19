"use server";

import { requireUser } from "@/server/auth/service";
import { globalSearch } from "@/server/services/search";

export async function searchAction(query: string) {
  try {
    const user = await requireUser();
    const results = await globalSearch(user, query, 10);
    return { ok: true as const, data: results };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Search failed",
      data: [] as Awaited<ReturnType<typeof globalSearch>>,
    };
  }
}
