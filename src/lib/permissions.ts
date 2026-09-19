/**
 * Permission model: MODULE → RESOURCE → ACTION
 * Authorization is always permission-code based — never role-name based.
 */

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "reject",
  "export",
  "import",
  "print",
  "assign",
  "publish",
  "archive",
] as const;

export type Action = (typeof ACTIONS)[number];

export type PermissionDef = {
  module: string;
  resource: string;
  action: Action;
  name: string;
  description?: string;
};

export function permissionCode(module: string, resource: string, action: string) {
  return `${module}.${resource}.${action}`.toLowerCase();
}

/** Catalog of all system permissions */
export const PERMISSION_CATALOG: PermissionDef[] = [
  // Users
  { module: "users", resource: "users", action: "view", name: "View Users" },
  { module: "users", resource: "users", action: "create", name: "Create Users" },
  { module: "users", resource: "users", action: "edit", name: "Edit Users" },
  { module: "users", resource: "users", action: "delete", name: "Delete Users" },
  { module: "users", resource: "users", action: "assign", name: "Assign User Roles" },
  { module: "users", resource: "users", action: "export", name: "Export Users" },

  // Roles & Permissions
  { module: "roles", resource: "roles", action: "view", name: "View Roles" },
  { module: "roles", resource: "roles", action: "create", name: "Create Roles" },
  { module: "roles", resource: "roles", action: "edit", name: "Edit Roles" },
  { module: "roles", resource: "roles", action: "delete", name: "Delete Roles" },
  { module: "roles", resource: "roles", action: "assign", name: "Assign Role Permissions" },
  { module: "roles", resource: "permissions", action: "view", name: "View Permissions" },

  // Organization
  { module: "organization", resource: "plants", action: "view", name: "View Plants" },
  { module: "organization", resource: "plants", action: "create", name: "Create Plants" },
  { module: "organization", resource: "plants", action: "edit", name: "Edit Plants" },
  { module: "organization", resource: "departments", action: "view", name: "View Departments" },
  { module: "organization", resource: "departments", action: "create", name: "Create Departments" },
  { module: "organization", resource: "departments", action: "edit", name: "Edit Departments" },
  { module: "organization", resource: "departments", action: "delete", name: "Delete Departments" },
  { module: "organization", resource: "designations", action: "view", name: "View Designations" },
  { module: "organization", resource: "designations", action: "create", name: "Create Designations" },
  { module: "organization", resource: "designations", action: "edit", name: "Edit Designations" },

  // Employees / HR
  { module: "hr", resource: "employees", action: "view", name: "View Employees" },
  { module: "hr", resource: "employees", action: "create", name: "Create Employees" },
  { module: "hr", resource: "employees", action: "edit", name: "Edit Employees" },
  { module: "hr", resource: "employees", action: "delete", name: "Delete Employees" },
  { module: "hr", resource: "employees", action: "export", name: "Export Employees" },
  { module: "hr", resource: "leave", action: "view", name: "View Leave" },
  { module: "hr", resource: "leave", action: "create", name: "Request Leave" },
  { module: "hr", resource: "leave", action: "approve", name: "Approve Leave" },
  { module: "hr", resource: "leave", action: "reject", name: "Reject Leave" },
  { module: "hr", resource: "attendance", action: "view", name: "View Attendance" },
  { module: "hr", resource: "attendance", action: "create", name: "Record Attendance" },
  { module: "hr", resource: "attendance", action: "edit", name: "Edit Attendance" },
  { module: "hr", resource: "attendance", action: "export", name: "Export Attendance" },

  // Production
  { module: "production", resource: "orders", action: "view", name: "View Production Orders" },
  { module: "production", resource: "orders", action: "create", name: "Create Production Orders" },
  { module: "production", resource: "orders", action: "edit", name: "Edit Production Orders" },
  { module: "production", resource: "orders", action: "approve", name: "Approve Production Orders" },
  { module: "production", resource: "orders", action: "reject", name: "Reject Production Orders" },
  { module: "production", resource: "orders", action: "export", name: "Export Production" },
  { module: "production", resource: "lines", action: "view", name: "View Production Lines" },
  { module: "production", resource: "lines", action: "edit", name: "Edit Production Lines" },
  { module: "production", resource: "schedules", action: "view", name: "View Schedules" },
  { module: "production", resource: "schedules", action: "create", name: "Create Schedules" },
  { module: "production", resource: "schedules", action: "edit", name: "Edit Schedules" },

  // Inventory
  { module: "inventory", resource: "stock", action: "view", name: "View Stock" },
  { module: "inventory", resource: "stock", action: "create", name: "Create Inventory Items" },
  { module: "inventory", resource: "stock", action: "edit", name: "Adjust Stock" },
  { module: "inventory", resource: "stock", action: "export", name: "Export Inventory" },
  { module: "inventory", resource: "warehouses", action: "view", name: "View Warehouses" },
  { module: "inventory", resource: "warehouses", action: "create", name: "Create Warehouses" },
  { module: "inventory", resource: "warehouses", action: "edit", name: "Edit Warehouses" },
  { module: "inventory", resource: "movements", action: "view", name: "View Stock Movements" },
  { module: "inventory", resource: "movements", action: "create", name: "Create Stock Movements" },

  // Procurement
  { module: "procurement", resource: "requests", action: "view", name: "View Purchase Requests" },
  { module: "procurement", resource: "requests", action: "create", name: "Create Purchase Requests" },
  { module: "procurement", resource: "requests", action: "approve", name: "Approve Purchase Requests" },
  { module: "procurement", resource: "requests", action: "reject", name: "Reject Purchase Requests" },
  { module: "procurement", resource: "orders", action: "view", name: "View Purchase Orders" },
  { module: "procurement", resource: "orders", action: "create", name: "Create Purchase Orders" },
  { module: "procurement", resource: "orders", action: "approve", name: "Approve Purchase Orders" },
  { module: "procurement", resource: "orders", action: "edit", name: "Edit Purchase Orders" },
  { module: "procurement", resource: "rfqs", action: "view", name: "View RFQs" },
  { module: "procurement", resource: "rfqs", action: "create", name: "Create RFQs" },
  { module: "procurement", resource: "receipts", action: "view", name: "View Goods Receipts" },
  { module: "procurement", resource: "receipts", action: "create", name: "Create Goods Receipts" },

  // Suppliers
  { module: "suppliers", resource: "suppliers", action: "view", name: "View Suppliers" },
  { module: "suppliers", resource: "suppliers", action: "create", name: "Create Suppliers" },
  { module: "suppliers", resource: "suppliers", action: "edit", name: "Edit Suppliers" },
  { module: "suppliers", resource: "suppliers", action: "delete", name: "Delete Suppliers" },
  { module: "suppliers", resource: "suppliers", action: "export", name: "Export Suppliers" },

  // Maintenance
  { module: "maintenance", resource: "equipment", action: "view", name: "View Equipment" },
  { module: "maintenance", resource: "equipment", action: "create", name: "Create Equipment" },
  { module: "maintenance", resource: "equipment", action: "edit", name: "Edit Equipment" },
  { module: "maintenance", resource: "work_orders", action: "view", name: "View Work Orders" },
  { module: "maintenance", resource: "work_orders", action: "create", name: "Create Work Orders" },
  { module: "maintenance", resource: "work_orders", action: "edit", name: "Edit Work Orders" },
  { module: "maintenance", resource: "work_orders", action: "assign", name: "Assign Work Orders" },

  // Quality
  { module: "quality", resource: "inspections", action: "view", name: "View Quality Inspections" },
  { module: "quality", resource: "inspections", action: "create", name: "Create Inspections" },
  { module: "quality", resource: "inspections", action: "edit", name: "Edit Inspections" },
  { module: "quality", resource: "inspections", action: "approve", name: "Approve Inspections" },
  { module: "quality", resource: "ncrs", action: "view", name: "View NCRs" },
  { module: "quality", resource: "ncrs", action: "create", name: "Create NCRs" },
  { module: "quality", resource: "ncrs", action: "edit", name: "Edit NCRs" },

  // Safety
  { module: "safety", resource: "incidents", action: "view", name: "View Safety Incidents" },
  { module: "safety", resource: "incidents", action: "create", name: "Report Incidents" },
  { module: "safety", resource: "incidents", action: "edit", name: "Edit Incidents" },
  { module: "safety", resource: "inspections", action: "view", name: "View Safety Inspections" },
  { module: "safety", resource: "inspections", action: "create", name: "Create Safety Inspections" },

  // Finance
  { module: "finance", resource: "budgets", action: "view", name: "View Budgets" },
  { module: "finance", resource: "budgets", action: "create", name: "Create Budgets" },
  { module: "finance", resource: "budgets", action: "edit", name: "Edit Budgets" },
  { module: "finance", resource: "expenses", action: "view", name: "View Expenses" },
  { module: "finance", resource: "expenses", action: "create", name: "Create Expenses" },
  { module: "finance", resource: "expenses", action: "approve", name: "Approve Expenses" },
  { module: "finance", resource: "payments", action: "view", name: "View Payment Requests" },
  { module: "finance", resource: "payments", action: "approve", name: "Approve Payments" },

  // Documents
  { module: "documents", resource: "documents", action: "view", name: "View Documents" },
  { module: "documents", resource: "documents", action: "create", name: "Upload Documents" },
  { module: "documents", resource: "documents", action: "edit", name: "Edit Documents" },
  { module: "documents", resource: "documents", action: "delete", name: "Delete Documents" },
  { module: "documents", resource: "documents", action: "export", name: "Download Documents" },

  // Workflows
  { module: "workflows", resource: "workflows", action: "view", name: "View Workflows" },
  { module: "workflows", resource: "workflows", action: "create", name: "Create Workflows" },
  { module: "workflows", resource: "workflows", action: "edit", name: "Edit Workflows" },
  { module: "workflows", resource: "workflows", action: "approve", name: "Approve Workflows" },

  // Reports
  { module: "reports", resource: "employee", action: "view", name: "View Employee Reports" },
  { module: "reports", resource: "employee", action: "export", name: "Export Employee Reports" },
  { module: "reports", resource: "production", action: "view", name: "View Production Reports" },
  { module: "reports", resource: "production", action: "export", name: "Export Production Reports" },
  { module: "reports", resource: "inventory", action: "view", name: "View Inventory Reports" },
  { module: "reports", resource: "inventory", action: "export", name: "Export Inventory Reports" },
  { module: "reports", resource: "procurement", action: "view", name: "View Procurement Reports" },
  { module: "reports", resource: "procurement", action: "export", name: "Export Procurement Reports" },
  { module: "reports", resource: "maintenance", action: "view", name: "View Maintenance Reports" },
  { module: "reports", resource: "quality", action: "view", name: "View Quality Reports" },
  { module: "reports", resource: "safety", action: "view", name: "View Safety Reports" },
  { module: "reports", resource: "attendance", action: "view", name: "View Attendance Reports" },
  { module: "reports", resource: "audit", action: "view", name: "View Audit Reports" },
  { module: "reports", resource: "audit", action: "export", name: "Export Audit Reports" },

  // Audit & Settings
  { module: "audit", resource: "logs", action: "view", name: "View Audit Logs" },
  { module: "audit", resource: "logs", action: "export", name: "Export Audit Logs" },
  { module: "settings", resource: "system", action: "view", name: "View System Settings" },
  { module: "settings", resource: "system", action: "edit", name: "Edit System Settings" },
  { module: "dashboard", resource: "dashboard", action: "view", name: "View Dashboard" },
  { module: "notifications", resource: "notifications", action: "view", name: "View Notifications" },
];

export const P = Object.fromEntries(
  PERMISSION_CATALOG.map((p) => [
    `${p.module}_${p.resource}_${p.action}`.toUpperCase().replace(/\./g, "_"),
    permissionCode(p.module, p.resource, p.action),
  ]),
) as Record<string, string>;

/** Initial system roles with permission scopes (by module prefix or specific codes) */
export const SYSTEM_ROLES = [
  {
    code: "super_admin",
    name: "Super Administrator",
    description: "Full system access across all modules",
    allPermissions: true,
  },
  {
    code: "administrator",
    name: "Administrator",
    description: "Administrative access excluding destructive system operations",
    modules: ["users", "roles", "organization", "hr", "dashboard", "notifications", "documents", "reports", "audit", "settings", "workflows"],
  },
  {
    code: "plant_manager",
    name: "Plant Manager",
    description: "Plant-wide operational oversight",
    modules: ["dashboard", "production", "inventory", "maintenance", "quality", "safety", "hr", "reports", "notifications", "documents"],
  },
  {
    code: "department_head",
    name: "Department Head",
    description: "Department leadership and approvals",
    modules: ["dashboard", "hr", "workflows", "notifications", "documents", "reports"],
  },
  {
    code: "hr_manager",
    name: "HR Manager",
    description: "Human resources management",
    modules: ["dashboard", "hr", "organization", "documents", "reports", "notifications", "workflows"],
  },
  {
    code: "finance_manager",
    name: "Finance Manager",
    description: "Budgets, expenses, and financial approvals",
    modules: ["dashboard", "finance", "procurement", "reports", "notifications", "workflows", "documents"],
  },
  {
    code: "procurement_manager",
    name: "Procurement Manager",
    description: "Purchase and supplier management",
    modules: ["dashboard", "procurement", "suppliers", "inventory", "reports", "notifications", "workflows", "documents"],
  },
  {
    code: "production_manager",
    name: "Production Manager",
    description: "Production planning and execution",
    modules: ["dashboard", "production", "inventory", "quality", "reports", "notifications"],
  },
  {
    code: "maintenance_manager",
    name: "Maintenance Manager",
    description: "Equipment and maintenance operations",
    modules: ["dashboard", "maintenance", "inventory", "reports", "notifications"],
  },
  {
    code: "inventory_manager",
    name: "Inventory Manager",
    description: "Warehouse and stock control",
    modules: ["dashboard", "inventory", "reports", "notifications"],
  },
  {
    code: "quality_manager",
    name: "Quality Manager",
    description: "Quality assurance and NCRs",
    modules: ["dashboard", "quality", "production", "reports", "notifications", "documents"],
  },
  {
    code: "safety_officer",
    name: "Safety Officer",
    description: "Safety incidents and compliance",
    modules: ["dashboard", "safety", "reports", "notifications", "documents"],
  },
  {
    code: "supervisor",
    name: "Supervisor",
    description: "Team supervision and limited approvals",
    modules: ["dashboard", "hr", "production", "notifications", "workflows"],
  },
  {
    code: "employee",
    name: "Employee",
    description: "Standard employee self-service access",
    permissions: [
      "dashboard.dashboard.view",
      "hr.leave.view",
      "hr.leave.create",
      "hr.attendance.view",
      "notifications.notifications.view",
      "documents.documents.view",
    ],
  },
  {
    code: "auditor",
    name: "Auditor",
    description: "Read-only audit and compliance access",
    modules: ["dashboard", "audit", "reports"],
    actions: ["view", "export"],
  },
  {
    code: "viewer",
    name: "Viewer",
    description: "Read-only access to authorized modules",
    modules: ["dashboard", "reports"],
    actions: ["view"],
  },
] as const;
