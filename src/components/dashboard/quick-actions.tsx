"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_ACTION_ICONS = {
  Users,
  UserRound,
  CalendarDays,
  FileText,
  ClipboardList,
} as const;

export type QuickActionIconName = keyof typeof QUICK_ACTION_ICONS;

export type QuickActionItem = {
  href: string;
  label: string;
  iconName: QuickActionIconName;
};

export function QuickActions({ actions }: { actions: QuickActionItem[] }) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No quick actions for your permissions.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => {
        const Icon = QUICK_ACTION_ICONS[action.iconName];
        return (
          <Button key={action.href} variant="outline" className="justify-start" asChild>
            <Link href={action.href}>
              <Icon className="size-4" />
              {action.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
