export type NavIconName =
  | "LayoutDashboard"
  | "Users"
  | "Shield"
  | "KeyRound"
  | "Building2"
  | "UserRound"
  | "Factory"
  | "Warehouse"
  | "ShoppingCart"
  | "Truck"
  | "Wrench"
  | "BadgeCheck"
  | "HardHat"
  | "FileText"
  | "GitBranch"
  | "Bell"
  | "BarChart3"
  | "ClipboardList"
  | "Settings"
  | "CalendarDays"
  | "Wallet";

export type NavItem = {
  title: string;
  href: string;
  icon: NavIconName;
  permission?: string;
  anyOf?: string[];
  children?: NavItem[];
};

/** Serializable navigation catalog — icons resolved on the client. */
export const NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    permission: "dashboard.dashboard.view",
  },
  {
    title: "Administration",
    href: "/admin",
    icon: "Shield",
    anyOf: ["users.users.view", "roles.roles.view", "roles.permissions.view"],
    children: [
      { title: "Users", href: "/users", icon: "Users", permission: "users.users.view" },
      { title: "Roles", href: "/roles", icon: "KeyRound", permission: "roles.roles.view" },
      { title: "Permissions", href: "/permissions", icon: "Shield", permission: "roles.permissions.view" },
      { title: "Audit Logs", href: "/audit-logs", icon: "ClipboardList", permission: "audit.logs.view" },
      { title: "Settings", href: "/settings", icon: "Settings", permission: "settings.system.view" },
    ],
  },
  {
    title: "Organization",
    href: "/organization",
    icon: "Building2",
    anyOf: ["organization.departments.view", "organization.plants.view"],
    children: [
      { title: "Plants", href: "/plants", icon: "Factory", permission: "organization.plants.view" },
      { title: "Departments", href: "/departments", icon: "Building2", permission: "organization.departments.view" },
      { title: "Designations", href: "/designations", icon: "BadgeCheck", permission: "organization.designations.view" },
    ],
  },
  {
    title: "Human Resources",
    href: "/hr",
    icon: "UserRound",
    anyOf: ["hr.employees.view", "hr.leave.view", "hr.attendance.view"],
    children: [
      { title: "Employees", href: "/employees", icon: "UserRound", permission: "hr.employees.view" },
      { title: "Attendance", href: "/attendance", icon: "CalendarDays", permission: "hr.attendance.view" },
      { title: "Leave", href: "/leave", icon: "CalendarDays", permission: "hr.leave.view" },
    ],
  },
  {
    title: "Production",
    href: "/production",
    icon: "Factory",
    anyOf: ["production.orders.view", "production.lines.view"],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: "Warehouse",
    permission: "inventory.stock.view",
  },
  {
    title: "Procurement",
    href: "/procurement",
    icon: "ShoppingCart",
    anyOf: ["procurement.requests.view", "procurement.orders.view"],
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: "Truck",
    permission: "suppliers.suppliers.view",
  },
  {
    title: "Maintenance",
    href: "/maintenance",
    icon: "Wrench",
    anyOf: ["maintenance.equipment.view", "maintenance.work_orders.view"],
  },
  {
    title: "Quality",
    href: "/quality",
    icon: "BadgeCheck",
    permission: "quality.inspections.view",
  },
  {
    title: "Safety",
    href: "/safety",
    icon: "HardHat",
    permission: "safety.incidents.view",
  },
  {
    title: "Finance",
    href: "/finance",
    icon: "Wallet",
    anyOf: ["finance.budgets.view", "finance.expenses.view"],
  },
  {
    title: "Documents",
    href: "/documents",
    icon: "FileText",
    permission: "documents.documents.view",
  },
  {
    title: "Workflows",
    href: "/workflows",
    icon: "GitBranch",
    permission: "workflows.workflows.view",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: "Bell",
    permission: "notifications.notifications.view",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: "BarChart3",
    anyOf: [
      "reports.employee.view",
      "reports.production.view",
      "reports.inventory.view",
      "reports.procurement.view",
      "reports.audit.view",
    ],
  },
];

export function filterNavigation(permissions: string[]): NavItem[] {
  const can = (item: NavItem) => {
    if (item.permission) return permissions.includes(item.permission);
    if (item.anyOf) return item.anyOf.some((p) => permissions.includes(p));
    return true;
  };

  return NAVIGATION.map((item) => {
    if (item.children) {
      const children = item.children.filter(can);
      if (children.length === 0) return null;
      return { ...item, children };
    }
    return can(item) ? item : null;
  }).filter(Boolean) as NavItem[];
}
