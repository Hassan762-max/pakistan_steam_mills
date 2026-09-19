import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
  {
    variants: {
      status: {
        active: "border-success/25 bg-success/10 text-success",
        inactive: "border-border bg-muted text-muted-foreground",
        pending: "border-warning/30 bg-warning/15 text-warning-foreground dark:text-warning",
        draft: "border-border bg-secondary text-secondary-foreground",
        approved: "border-success/25 bg-success/10 text-success",
        rejected: "border-destructive/25 bg-destructive/10 text-destructive",
        completed: "border-info/25 bg-info/10 text-info",
        cancelled: "border-border bg-muted text-muted-foreground",
        in_progress: "border-accent/30 bg-accent/10 text-accent",
        open: "border-info/25 bg-info/10 text-info",
        closed: "border-border bg-muted text-muted-foreground",
        maintenance: "border-warning/30 bg-warning/15 text-warning-foreground dark:text-warning",
        critical: "border-destructive/30 bg-destructive/15 text-destructive",
        pending_approval: "border-warning/30 bg-warning/15 text-warning-foreground dark:text-warning",
      },
    },
    defaultVariants: {
      status: "inactive",
    },
  },
);

export type StatusBadgeStatus = NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>;

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
  showDot?: boolean;
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function StatusBadge({
  className,
  status = "inactive",
  label,
  showDot = true,
  ...props
}: StatusBadgeProps) {
  const resolved = status ?? "inactive";

  return (
    <span className={cn(statusBadgeVariants({ status: resolved }), className)} {...props}>
      {showDot ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-current opacity-80"
          aria-hidden
        />
      ) : null}
      {label ?? formatStatusLabel(resolved)}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
