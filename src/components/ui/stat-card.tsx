"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Boxes,
  CheckSquare,
  ClipboardList,
  Factory,
  FileText,
  Gauge,
  GitBranch,
  HardHat,
  Package,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const STAT_ICONS = {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Boxes,
  CheckSquare,
  ClipboardList,
  Factory,
  FileText,
  Gauge,
  GitBranch,
  HardHat,
  Package,
  ShoppingCart,
  Target,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  TrendingUp,
} as const;

export type StatIconName = keyof typeof STAT_ICONS;

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  description?: string;
  /** Serializable icon key — safe across Server → Client boundaries */
  icon?: StatIconName | LucideIcon | React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
}

function resolveIcon(icon: StatCardProps["icon"]): React.ReactNode {
  if (!icon) return null;
  if (typeof icon === "string" && icon in STAT_ICONS) {
    const Icon = STAT_ICONS[icon as StatIconName];
    return <Icon className="size-4" aria-hidden />;
  }
  if (
    typeof icon === "function" ||
    (typeof icon === "object" &&
      icon !== null &&
      "$$typeof" in icon &&
      "render" in (icon as Record<string, unknown>))
  ) {
    const Icon = icon as LucideIcon;
    return <Icon className="size-4" aria-hidden />;
  }
  return icon;
}

function StatCard({
  className,
  title,
  value,
  description,
  icon,
  trend,
  ...props
}: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : null;
  const iconNode = resolveIcon(icon);

  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {iconNode ? (
          <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {iconNode}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="font-heading text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                isPositive ? "text-success" : "text-destructive",
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-3.5" aria-hidden />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden />
              )}
              {Math.abs(trend.value)}%
              {trend.label ? <span className="font-normal text-muted-foreground"> {trend.label}</span> : null}
            </span>
          ) : null}
          {description ? <span>{description}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export { StatCard };
