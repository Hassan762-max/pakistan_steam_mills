import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ServerPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
};

function buildHref(
  basePath: string,
  searchParams: Record<string, string | undefined> | undefined,
  page: number,
) {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ServerPagination({
  page,
  totalPages,
  total,
  basePath,
  searchParams,
  className,
}: ServerPaginationProps) {
  if (totalPages <= 1 && total === 0) return null;

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <p className="text-sm text-muted-foreground">
        {total} result{total === 1 ? "" : "s"} · Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link
            href={buildHref(basePath, searchParams, Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
          <Link
            href={buildHref(basePath, searchParams, Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
          >
            Next
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
