"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Factory, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVIGATION, type NavItem } from "@/lib/navigation";
import { getNavIcon } from "@/lib/nav-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = getNavIcon(item.icon);
  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

function NavGroup({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const Icon = getNavIcon(item.icon);
  const childActive = item.children?.some(
    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
  const [open, setOpen] = React.useState(Boolean(childActive));

  if (!item.children?.length) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return <NavLink item={item} collapsed={collapsed} active={active} />;
  }

  if (collapsed) {
    return (
      <div className="space-y-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center justify-center rounded-md px-2 py-2 text-sidebar-foreground",
                childActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
        {item.children.map((child) => {
          const active = pathname === child.href || pathname.startsWith(`${child.href}/`);
          return <NavLink key={child.href} item={child} collapsed active={active} />;
        })}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            childActive && "bg-sidebar-accent/70",
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{item.title}</span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1 pl-3">
        {item.children.map((child) => {
          const active = pathname === child.href || pathname.startsWith(`${child.href}/`);
          return <NavLink key={child.href} item={child} collapsed={false} active={active} />;
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export interface AppSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  items?: NavItem[];
  className?: string;
}

export function AppSidebar({
  collapsed = false,
  onCollapsedChange,
  items = NAVIGATION,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-sidebar-border px-3",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-8 items-center justify-center rounded-md bg-steel-navy text-primary-foreground dark:bg-accent">
          <Factory className="size-4" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 leading-tight">
            <p className="font-heading truncate text-sm font-semibold tracking-tight">
              Pakistan Steel
            </p>
            <p className="truncate text-[11px] text-muted-foreground">Mills Management</p>
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {items.map((item) => (
            <NavGroup
              key={item.href}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </nav>
      </ScrollArea>

      <Separator />
      <div className={cn("p-2", collapsed && "flex justify-center")}>
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("w-full justify-start gap-2", collapsed && "w-9 justify-center")}
          onClick={() => onCollapsedChange?.(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed ? <span>Collapse</span> : null}
        </Button>
      </div>
    </aside>
  );
}
