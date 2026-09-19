"use client";

import {
  LayoutDashboard,
  Users,
  Shield,
  KeyRound,
  Building2,
  UserRound,
  Factory,
  Warehouse,
  ShoppingCart,
  Truck,
  Wrench,
  BadgeCheck,
  HardHat,
  FileText,
  GitBranch,
  Bell,
  BarChart3,
  ClipboardList,
  Settings,
  CalendarDays,
  Wallet,
  Circle,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "@/lib/navigation";

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  LayoutDashboard,
  Users,
  Shield,
  KeyRound,
  Building2,
  UserRound,
  Factory,
  Warehouse,
  ShoppingCart,
  Truck,
  Wrench,
  BadgeCheck,
  HardHat,
  FileText,
  GitBranch,
  Bell,
  BarChart3,
  ClipboardList,
  Settings,
  CalendarDays,
  Wallet,
};

export function getNavIcon(name: NavIconName | string | undefined): LucideIcon {
  if (name && name in NAV_ICONS) {
    return NAV_ICONS[name as NavIconName];
  }
  return Circle;
}
