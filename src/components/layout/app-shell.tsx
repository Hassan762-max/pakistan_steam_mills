"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  navItems?: NavItem[];
  notificationCount?: number;
  user?: {
    name: string;
    email?: string;
    image?: string | null;
    initials?: string;
  };
  className?: string;
}

export function AppShell({
  children,
  title,
  navItems,
  notificationCount,
  user,
  className,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  return (
    <div className={cn("flex min-h-screen bg-background text-foreground", className)}>
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            items={navItems}
          />
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <AppSidebar
            collapsed={false}
            items={navItems}
            className="h-full border-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          notificationCount={notificationCount}
          user={user}
          onMenuClick={() => setMobileOpen(true)}
          onSearchClick={() => setCommandOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={navItems}
      />
    </div>
  );
}
