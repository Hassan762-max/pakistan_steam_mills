/**
 * Pakistan Steel Mills Management System — comprehensive seed data
 * Default password for all users: Password@123
 * No real personal information is used.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  permissionCode,
} from "../src/lib/permissions";

const db = new PrismaClient();

/** Mirrors resolveRolePermissionCodes without pulling Next.js auth deps into seed. */
function resolveRolePermissionCodes(roleCode: string): string[] {
  const role = SYSTEM_ROLES.find((r) => r.code === roleCode);
  if (!role) return [];
  if ("allPermissions" in role && role.allPermissions) {
    return PERMISSION_CATALOG.map((p) => permissionCode(p.module, p.resource, p.action));
  }
  if ("permissions" in role && role.permissions) {
    return [...role.permissions];
  }
  const modules = "modules" in role ? role.modules : undefined;
  const actions = "actions" in role ? role.actions : undefined;
  return PERMISSION_CATALOG.filter((p) => {
    if (modules && !(modules as readonly string[]).includes(p.module)) return false;
    if (actions && !(actions as readonly string[]).includes(p.action)) return false;
    return true;
  }).map((p) => permissionCode(p.module, p.resource, p.action));
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function atDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

async function main() {
  console.log("🌱 Seeding Pakistan Steel Mills Management System...\n");

  // Wipe in dependency-safe order for re-runs on existing DB
  const tables = [
    "workflowAction",
    "workflowInstance",
    "workflowDefinition",
    "notification",
    "notificationPreference",
    "auditLog",
    "systemSetting",
    "document",
    "paymentRequest",
    "expense",
    "budget",
    "costCenter",
    "ppeRecord",
    "safetyTraining",
    "safetyInspection",
    "safetyIncident",
    "qualityCertificate",
    "nonConformanceReport",
    "qualityTestResult",
    "qualityInspection",
    "maintenanceWorkOrder",
    "maintenanceSchedule",
    "equipment",
    "invoice",
    "goodsReceiptItem",
    "goodsReceipt",
    "purchaseOrderItem",
    "purchaseOrder",
    "quotation",
    "rFQ",
    "purchaseRequestItem",
    "purchaseRequest",
    "supplierPerformance",
    "supplierContract",
    "supplier",
    "materialConsumption",
    "productionDowntime",
    "productionSchedule",
    "productionOrder",
    "productionLine",
    "stockMovement",
    "stockLevel",
    "storageLocation",
    "inventoryItem",
    "warehouse",
    "attendanceRecord",
    "shiftAssignment",
    "shift",
    "holiday",
    "leaveRequest",
    "leaveBalance",
    "leaveType",
    "trainingRecord",
    "performanceReview",
    "employeeTransfer",
    "employeePromotion",
    "userPermission",
    "userRole",
    "rolePermission",
    "loginHistory",
    "passwordResetToken",
    "emailVerificationToken",
    "session",
    "user",
    "employee",
    "designation",
    "team",
    "section",
    "department",
    "division",
    "plant",
    "organization",
    "permission",
    "role",
  ] as const;

  for (const table of tables) {
    try {
      // @ts-expect-error dynamic model access for reset
      await db[table].deleteMany();
    } catch {
      // ignore missing / empty
    }
  }

  const passwordHash = await hashPassword("Password@123");
  const year = new Date().getFullYear();

  // ── Permissions ──
  console.log("• Permissions");
  const permissionMap = new Map<string, string>();
  for (const p of PERMISSION_CATALOG) {
    const code = permissionCode(p.module, p.resource, p.action);
    const created = await db.permission.create({
      data: {
        module: p.module,
        resource: p.resource,
        action: p.action,
        code,
        name: p.name,
        description: p.description ?? null,
      },
    });
    permissionMap.set(code, created.id);
  }

  // ── Roles ──
  console.log("• System roles");
  const roleMap = new Map<string, string>();
  for (const role of SYSTEM_ROLES) {
    const created = await db.role.create({
      data: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
        isActive: true,
      },
    });
    roleMap.set(role.code, created.id);
    const codes = resolveRolePermissionCodes(role.code);
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await db.rolePermission.create({
        data: { roleId: created.id, permissionId },
      });
    }
  }

  // ── Organization structure ──
  console.log("• Organization");
  const org = await db.organization.create({
    data: {
      name: "Pakistan Steel Mills",
      code: "PSM",
      legalName: "Pakistan Steel Mills Corporation (Pvt.) Limited",
      taxId: "NTN-0000000-0",
      address: "Bin Qasim, Port Qasim Authority",
      city: "Karachi",
      country: "Pakistan",
      phone: "+92-21-34720000",
      email: "info@psm.gov.pk",
      website: "https://www.paksteel.com.pk",
      settings: JSON.stringify({ timezone: "Asia/Karachi", currency: "PKR", fiscalYearStartMonth: 7 }),
    },
  });

  const binQasim = await db.plant.create({
    data: {
      organizationId: org.id,
      code: "BQW",
      name: "Bin Qasim Works",
      location: "Port Qasim Industrial Area",
      city: "Karachi",
      capacityTons: 1100000,
      status: "active",
    },
  });

  const downstream = await db.plant.create({
    data: {
      organizationId: org.id,
      code: "DSM",
      name: "Downstream Mill",
      location: "Bin Qasim Downstream Complex",
      city: "Karachi",
      capacityTons: 350000,
      status: "active",
    },
  });

  const opsDiv = await db.division.create({
    data: { plantId: binQasim.id, code: "OPS", name: "Operations Division", status: "active" },
  });
  const supportDiv = await db.division.create({
    data: { plantId: binQasim.id, code: "SUP", name: "Support Services Division", status: "active" },
  });
  const downDiv = await db.division.create({
    data: { plantId: downstream.id, code: "DWN", name: "Downstream Operations", status: "active" },
  });

  const deptDefs = [
    { code: "PROD", name: "Production", divisionId: opsDiv.id, plantId: binQasim.id, costCenter: "CC-PROD" },
    { code: "HR", name: "HR", divisionId: supportDiv.id, plantId: binQasim.id, costCenter: "CC-HR" },
    { code: "FIN", name: "Finance", divisionId: supportDiv.id, plantId: binQasim.id, costCenter: "CC-FIN" },
    { code: "PROC", name: "Procurement", divisionId: supportDiv.id, plantId: binQasim.id, costCenter: "CC-PROC" },
    { code: "MAINT", name: "Maintenance", divisionId: opsDiv.id, plantId: binQasim.id, costCenter: "CC-MAINT" },
    { code: "QA", name: "Quality", divisionId: opsDiv.id, plantId: binQasim.id, costCenter: "CC-QA" },
    { code: "HSE", name: "Safety", divisionId: opsDiv.id, plantId: binQasim.id, costCenter: "CC-HSE" },
    { code: "INV", name: "Inventory", divisionId: supportDiv.id, plantId: binQasim.id, costCenter: "CC-INV" },
    { code: "IT", name: "IT", divisionId: supportDiv.id, plantId: binQasim.id, costCenter: "CC-IT" },
    { code: "DPROD", name: "Downstream Production", divisionId: downDiv.id, plantId: downstream.id, costCenter: "CC-DPROD" },
  ] as const;

  const deptMap = new Map<string, string>();
  for (const d of deptDefs) {
    const created = await db.department.create({
      data: {
        code: d.code,
        name: d.name,
        divisionId: d.divisionId,
        plantId: d.plantId,
        costCenter: d.costCenter,
        description: `${d.name} department — Pakistan Steel Mills`,
        status: "active",
      },
    });
    deptMap.set(d.code, created.id);
  }

  const sectionDefs = [
    { dept: "PROD", code: "BF", name: "Blast Furnace" },
    { dept: "PROD", code: "SMS", name: "Steel Melting Shop" },
    { dept: "PROD", code: "CCM", name: "Continuous Casting" },
    { dept: "MAINT", code: "MECH", name: "Mechanical Workshop" },
    { dept: "MAINT", code: "ELEC", name: "Electrical Workshop" },
    { dept: "QA", code: "LAB", name: "Metallurgical Lab" },
    { dept: "HR", code: "PAY", name: "Payroll" },
    { dept: "INV", code: "RM", name: "Raw Materials Yard" },
  ] as const;

  for (const s of sectionDefs) {
    await db.section.create({
      data: {
        departmentId: deptMap.get(s.dept)!,
        code: s.code,
        name: s.name,
        status: "active",
      },
    });
  }

  const designationDefs = [
    { code: "GM", title: "General Manager", grade: "G1", level: 10 },
    { code: "PM", title: "Plant Manager", grade: "G2", level: 9 },
    { code: "MGR", title: "Manager", grade: "G3", level: 7 },
    { code: "AMGR", title: "Assistant Manager", grade: "G4", level: 6 },
    { code: "SUPV", title: "Supervisor", grade: "G5", level: 5 },
    { code: "ENG", title: "Engineer", grade: "G5", level: 5 },
    { code: "OFF", title: "Officer", grade: "G6", level: 4 },
    { code: "TECH", title: "Technician", grade: "G7", level: 3 },
    { code: "OPR", title: "Operator", grade: "G8", level: 2 },
    { code: "CLK", title: "Clerk", grade: "G8", level: 2 },
  ] as const;

  const desigMap = new Map<string, string>();
  for (const d of designationDefs) {
    const created = await db.designation.create({
      data: { ...d, status: "active", description: d.title },
    });
    desigMap.set(d.code, created.id);
  }

  // ── Employees (25+) ──
  console.log("• Employees & users");
  const employeeSeed = [
    { no: "PSM-0001", first: "Imran", last: "Hassan", dept: "PROD", desig: "PM", email: "plant.manager@psm.gov.pk", phone: "0300-1000001", city: "Karachi", grade: "G2" },
    { no: "PSM-0002", first: "Nadia", last: "Farooq", dept: "HR", desig: "MGR", email: "hr.manager@psm.gov.pk", phone: "0300-1000002", city: "Karachi", grade: "G3" },
    { no: "PSM-0003", first: "Kamran", last: "Ali", dept: "FIN", desig: "MGR", email: "finance.manager@psm.gov.pk", phone: "0300-1000003", city: "Karachi", grade: "G3" },
    { no: "PSM-0004", first: "Sana", last: "Malik", dept: "PROC", desig: "MGR", email: "procurement@psm.gov.pk", phone: "0300-1000004", city: "Karachi", grade: "G3" },
    { no: "PSM-0005", first: "Tariq", last: "Mehmood", dept: "PROD", desig: "MGR", email: "production@psm.gov.pk", phone: "0300-1000005", city: "Karachi", grade: "G3" },
    { no: "PSM-0006", first: "Asif", last: "Raza", dept: "MAINT", desig: "MGR", email: "maintenance@psm.gov.pk", phone: "0300-1000006", city: "Karachi", grade: "G3" },
    { no: "PSM-0007", first: "Hina", last: "Qureshi", dept: "QA", desig: "MGR", email: "quality@psm.gov.pk", phone: "0300-1000007", city: "Karachi", grade: "G3" },
    { no: "PSM-0008", first: "Bilal", last: "Ahmed", dept: "HSE", desig: "OFF", email: "safety@psm.gov.pk", phone: "0300-1000008", city: "Karachi", grade: "G6" },
    { no: "PSM-0009", first: "Usman", last: "Sheikh", dept: "PROD", desig: "OPR", email: "employee@psm.gov.pk", phone: "0300-1000009", city: "Karachi", grade: "G8" },
    { no: "PSM-0010", first: "Fahad", last: "Iqbal", dept: "FIN", desig: "OFF", email: "auditor@psm.gov.pk", phone: "0300-1000010", city: "Karachi", grade: "G6" },
    { no: "PSM-0011", first: "Ayesha", last: "Khan", dept: "IT", desig: "MGR", email: "admin@psm.gov.pk", phone: "0300-1000011", city: "Karachi", grade: "G3" },
    { no: "PSM-0012", first: "Javed", last: "Anwar", dept: "PROD", desig: "SUPV", email: "javed.anwar@psm.gov.pk", phone: "0300-1000012", city: "Karachi", grade: "G5" },
    { no: "PSM-0013", first: "Rabia", last: "Siddiqui", dept: "QA", desig: "ENG", email: "rabia.siddiqui@psm.gov.pk", phone: "0300-1000013", city: "Karachi", grade: "G5" },
    { no: "PSM-0014", first: "Shahid", last: "Nawaz", dept: "MAINT", desig: "TECH", email: "shahid.nawaz@psm.gov.pk", phone: "0300-1000014", city: "Karachi", grade: "G7" },
    { no: "PSM-0015", first: "Mariam", last: "Yousuf", dept: "HR", desig: "OFF", email: "mariam.yousuf@psm.gov.pk", phone: "0300-1000015", city: "Karachi", grade: "G6" },
    { no: "PSM-0016", first: "Omar", last: "Zafar", dept: "INV", desig: "AMGR", email: "omar.zafar@psm.gov.pk", phone: "0300-1000016", city: "Karachi", grade: "G4" },
    { no: "PSM-0017", first: "Naveed", last: "Akhtar", dept: "PROD", desig: "ENG", email: "naveed.akhtar@psm.gov.pk", phone: "0300-1000017", city: "Karachi", grade: "G5" },
    { no: "PSM-0018", first: "Saima", last: "Rehman", dept: "PROC", desig: "OFF", email: "saima.rehman@psm.gov.pk", phone: "0300-1000018", city: "Karachi", grade: "G6" },
    { no: "PSM-0019", first: "Waqas", last: "Hussain", dept: "PROD", desig: "OPR", email: "waqas.hussain@psm.gov.pk", phone: "0300-1000019", city: "Thatta", grade: "G8" },
    { no: "PSM-0020", first: "Farah", last: "Naz", dept: "FIN", desig: "CLK", email: "farah.naz@psm.gov.pk", phone: "0300-1000020", city: "Karachi", grade: "G8" },
    { no: "PSM-0021", first: "Adnan", last: "Saeed", dept: "MAINT", desig: "ENG", email: "adnan.saeed@psm.gov.pk", phone: "0300-1000021", city: "Karachi", grade: "G5" },
    { no: "PSM-0022", first: "Zainab", last: "Latif", dept: "HSE", desig: "OFF", email: "zainab.latif@psm.gov.pk", phone: "0300-1000022", city: "Karachi", grade: "G6" },
    { no: "PSM-0023", first: "Haroon", last: "Mirza", dept: "DPROD", desig: "SUPV", email: "haroon.mirza@psm.gov.pk", phone: "0300-1000023", city: "Karachi", grade: "G5" },
    { no: "PSM-0024", first: "Iqra", last: "Bashir", dept: "QA", desig: "TECH", email: "iqra.bashir@psm.gov.pk", phone: "0300-1000024", city: "Karachi", grade: "G7" },
    { no: "PSM-0025", first: "Danish", last: "Jamil", dept: "INV", desig: "CLK", email: "danish.jamil@psm.gov.pk", phone: "0300-1000025", city: "Karachi", grade: "G8" },
    { no: "PSM-0026", first: "Sadia", last: "Parveen", dept: "IT", desig: "ENG", email: "sadia.parveen@psm.gov.pk", phone: "0300-1000026", city: "Karachi", grade: "G5" },
    { no: "PSM-0027", first: "Rizwan", last: "Gul", dept: "PROD", desig: "TECH", email: "rizwan.gul@psm.gov.pk", phone: "0300-1000027", city: "Hyderabad", grade: "G7" },
    { no: "PSM-0028", first: "Mehwish", last: "Tariq", dept: "HR", desig: "CLK", email: "mehwish.tariq@psm.gov.pk", phone: "0300-1000028", city: "Karachi", grade: "G8" },
  ] as const;

  const employeeIds: string[] = [];
  const employeeByEmail = new Map<string, string>();

  for (const e of employeeSeed) {
    const emp = await db.employee.create({
      data: {
        employeeNumber: e.no,
        firstName: e.first,
        lastName: e.last,
        fullName: `${e.first} ${e.last}`,
        cnic: `42101-${String(1000000 + Number(e.no.slice(-4))).padStart(7, "0")}-1`,
        email: e.email,
        phone: e.phone,
        gender: ["Nadia", "Sana", "Hina", "Ayesha", "Rabia", "Mariam", "Saima", "Farah", "Zainab", "Iqra", "Sadia", "Mehwish"].includes(e.first)
          ? "female"
          : "male",
        city: e.city,
        address: `PSM Colony Block ${e.no.slice(-2)}, Bin Qasim`,
        departmentId: deptMap.get(e.dept)!,
        designationId: desigMap.get(e.desig)!,
        plantId: e.dept === "DPROD" ? downstream.id : binQasim.id,
        employmentType: "permanent",
        employmentStatus: "active",
        grade: e.grade,
        joiningDate: daysAgo(365 + Number(e.no.slice(-2)) * 40),
        confirmationDate: daysAgo(300 + Number(e.no.slice(-2)) * 30),
        bloodGroup: ["A+", "B+", "O+", "AB+", "A-", "B-"][Number(e.no.slice(-1)) % 6],
        emergencyContact: "Emergency Contact (Demo)",
        emergencyPhone: "0300-1999999",
        skills: JSON.stringify(["Steel operations", "Safety awareness"]),
        qualifications: JSON.stringify([{ degree: "BSc / Diploma", institution: "Demo University" }]),
        experienceYears: 3 + (Number(e.no.slice(-2)) % 15),
        bankAccount: `PK00PSMP00000000${e.no.slice(-4)}`,
      },
    });
    employeeIds.push(emp.id);
    employeeByEmail.set(e.email, emp.id);
  }

  // Link supervisors
  await db.employee.update({
    where: { id: employeeByEmail.get("employee@psm.gov.pk")! },
    data: { supervisorId: employeeByEmail.get("production@psm.gov.pk")! },
  });

  type UserSeed = {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    employeeEmail?: string;
  };

  const userSeeds: UserSeed[] = [
    { email: "admin@psm.gov.pk", username: "admin", firstName: "Ayesha", lastName: "Khan", role: "super_admin", employeeEmail: "admin@psm.gov.pk" },
    { email: "plant.manager@psm.gov.pk", username: "plant.manager", firstName: "Imran", lastName: "Hassan", role: "plant_manager", employeeEmail: "plant.manager@psm.gov.pk" },
    { email: "hr.manager@psm.gov.pk", username: "hr.manager", firstName: "Nadia", lastName: "Farooq", role: "hr_manager", employeeEmail: "hr.manager@psm.gov.pk" },
    { email: "finance.manager@psm.gov.pk", username: "finance.manager", firstName: "Kamran", lastName: "Ali", role: "finance_manager", employeeEmail: "finance.manager@psm.gov.pk" },
    { email: "procurement@psm.gov.pk", username: "procurement", firstName: "Sana", lastName: "Malik", role: "procurement_manager", employeeEmail: "procurement@psm.gov.pk" },
    { email: "production@psm.gov.pk", username: "production", firstName: "Tariq", lastName: "Mehmood", role: "production_manager", employeeEmail: "production@psm.gov.pk" },
    { email: "maintenance@psm.gov.pk", username: "maintenance", firstName: "Asif", lastName: "Raza", role: "maintenance_manager", employeeEmail: "maintenance@psm.gov.pk" },
    { email: "quality@psm.gov.pk", username: "quality", firstName: "Hina", lastName: "Qureshi", role: "quality_manager", employeeEmail: "quality@psm.gov.pk" },
    { email: "safety@psm.gov.pk", username: "safety", firstName: "Bilal", lastName: "Ahmed", role: "safety_officer", employeeEmail: "safety@psm.gov.pk" },
    { email: "employee@psm.gov.pk", username: "employee", firstName: "Usman", lastName: "Sheikh", role: "employee", employeeEmail: "employee@psm.gov.pk" },
    { email: "auditor@psm.gov.pk", username: "auditor", firstName: "Fahad", lastName: "Iqbal", role: "auditor", employeeEmail: "auditor@psm.gov.pk" },
  ];

  const userMap = new Map<string, string>();
  for (const u of userSeeds) {
    const created = await db.user.create({
      data: {
        email: u.email,
        username: u.username,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        status: "active",
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        employeeId: u.employeeEmail ? employeeByEmail.get(u.employeeEmail) : undefined,
        phone: "0300-1000000",
      },
    });
    userMap.set(u.email, created.id);
    await db.userRole.create({
      data: {
        userId: created.id,
        roleId: roleMap.get(u.role)!,
        plantId: binQasim.id,
      },
    });
    await db.notificationPreference.create({ data: { userId: created.id } });
  }

  await db.plant.update({
    where: { id: binQasim.id },
    data: { managerId: userMap.get("plant.manager@psm.gov.pk") },
  });

  // ── Shifts, leave, holidays ──
  console.log("• Shifts, leave types, holidays");
  const shiftA = await db.shift.create({
    data: { code: "A", name: "Shift A (Morning)", startTime: "06:00", endTime: "14:00", breakMinutes: 30 },
  });
  const shiftB = await db.shift.create({
    data: { code: "B", name: "Shift B (Afternoon)", startTime: "14:00", endTime: "22:00", breakMinutes: 30 },
  });
  const shiftC = await db.shift.create({
    data: { code: "C", name: "Shift C (Night)", startTime: "22:00", endTime: "06:00", breakMinutes: 30 },
  });

  for (let i = 0; i < 12; i++) {
    await db.shiftAssignment.create({
      data: {
        employeeId: employeeIds[i],
        shiftId: [shiftA.id, shiftB.id, shiftC.id][i % 3],
        effectiveFrom: daysAgo(90),
      },
    });
  }

  const leaveAnnual = await db.leaveType.create({
    data: { code: "AL", name: "Annual Leave", daysPerYear: 20, isPaid: true },
  });
  const leaveSick = await db.leaveType.create({
    data: { code: "SL", name: "Sick Leave", daysPerYear: 10, isPaid: true },
  });
  const leaveCasual = await db.leaveType.create({
    data: { code: "CL", name: "Casual Leave", daysPerYear: 10, isPaid: true },
  });
  await db.leaveType.create({
    data: { code: "ML", name: "Maternity Leave", daysPerYear: 90, isPaid: true },
  });

  for (const empId of employeeIds.slice(0, 15)) {
    for (const lt of [leaveAnnual, leaveSick, leaveCasual]) {
      await db.leaveBalance.create({
        data: {
          employeeId: empId,
          leaveTypeId: lt.id,
          year,
          entitled: lt.daysPerYear,
          used: lt.code === "AL" ? 2 : 0,
          pending: 0,
          carriedForward: 0,
        },
      });
    }
  }

  await db.leaveRequest.create({
    data: {
      employeeId: employeeByEmail.get("employee@psm.gov.pk")!,
      leaveTypeId: leaveAnnual.id,
      requesterId: userMap.get("employee@psm.gov.pk"),
      startDate: daysFromNow(14),
      endDate: daysFromNow(16),
      days: 3,
      reason: "Family visit (demo)",
      status: "pending",
    },
  });

  const holidays = [
    { name: "Pakistan Day", date: atDate(year, 3, 23) },
    { name: "Labour Day", date: atDate(year, 5, 1) },
    { name: "Independence Day", date: atDate(year, 8, 14) },
    { name: "Iqbal Day", date: atDate(year, 11, 9) },
    { name: "Quaid-e-Azam Day", date: atDate(year, 12, 25) },
  ];
  for (const h of holidays) {
    await db.holiday.create({ data: { ...h, type: "public" } });
  }

  // Sample attendance
  for (let i = 0; i < 5; i++) {
    await db.attendanceRecord.create({
      data: {
        employeeId: employeeIds[i],
        userId: i < userSeeds.length ? userMap.get(userSeeds[i].email) : undefined,
        shiftId: shiftA.id,
        date: daysAgo(i),
        checkIn: new Date(daysAgo(i).setHours(6, 5 + i, 0, 0)),
        checkOut: new Date(daysAgo(i).setHours(14, 2, 0, 0)),
        status: i === 2 ? "late" : "present",
        lateMinutes: i === 2 ? 15 : 0,
      },
    });
  }

  // ── Inventory ──
  console.log("• Inventory & warehouses");
  const whRaw = await db.warehouse.create({
    data: {
      plantId: binQasim.id,
      code: "WH-RAW",
      name: "Raw Materials Yard",
      type: "raw",
      location: "North Yard",
    },
  });
  const whFin = await db.warehouse.create({
    data: {
      plantId: binQasim.id,
      code: "WH-FIN",
      name: "Finished Goods Warehouse",
      type: "finished",
      location: "South Bay",
    },
  });
  const whSpare = await db.warehouse.create({
    data: {
      plantId: binQasim.id,
      code: "WH-SPARE",
      name: "Spare Parts Store",
      type: "spare",
      location: "Central Stores",
    },
  });

  const locA1 = await db.storageLocation.create({
    data: { warehouseId: whRaw.id, code: "A-01", name: "Aisle A Rack 01", aisle: "A", rack: "01", bin: "01" },
  });
  const locF1 = await db.storageLocation.create({
    data: { warehouseId: whFin.id, code: "F-01", name: "Finished Bay 01", aisle: "F", rack: "01", bin: "01" },
  });
  const locS1 = await db.storageLocation.create({
    data: { warehouseId: whSpare.id, code: "S-01", name: "Spares Shelf 01", aisle: "S", rack: "01", bin: "01" },
  });

  const items = [
    { code: "RM-BILLET-150", name: "Steel Billet 150mm", category: "raw_material", unit: "MT", reorder: 500, qty: 320, cost: 145000, wh: whRaw, loc: locA1 },
    { code: "RM-SLAB-200", name: "Steel Slab 200mm", category: "raw_material", unit: "MT", reorder: 400, qty: 580, cost: 138000, wh: whRaw, loc: locA1 },
    { code: "FG-REBAR-12", name: "Deformed Rebar 12mm", category: "finished_steel", unit: "MT", reorder: 200, qty: 150, cost: 185000, wh: whFin, loc: locF1 },
    { code: "FG-REBAR-16", name: "Deformed Rebar 16mm", category: "finished_steel", unit: "MT", reorder: 180, qty: 420, cost: 182000, wh: whFin, loc: locF1 },
    { code: "FG-HRCOIL", name: "Hot Rolled Coil", category: "finished_steel", unit: "MT", reorder: 100, qty: 75, cost: 195000, wh: whFin, loc: locF1 },
    { code: "SP-BEARING-6205", name: "Bearing 6205-2RS", category: "spare_parts", unit: "EA", reorder: 50, qty: 18, cost: 4500, wh: whSpare, loc: locS1 },
    { code: "SP-MOTOR-45KW", name: "AC Motor 45kW", category: "spare_parts", unit: "EA", reorder: 4, qty: 2, cost: 350000, wh: whSpare, loc: locS1 },
    { code: "SP-HYD-PUMP", name: "Hydraulic Pump Unit", category: "spare_parts", unit: "EA", reorder: 3, qty: 5, cost: 280000, wh: whSpare, loc: locS1 },
    { code: "CN-LUBE-ISO68", name: "Hydraulic Oil ISO 68", category: "consumables", unit: "L", reorder: 1000, qty: 650, cost: 850, wh: whSpare, loc: locS1 },
    { code: "RM-IRONORE", name: "Iron Ore Fines", category: "raw_material", unit: "MT", reorder: 2000, qty: 4500, cost: 22000, wh: whRaw, loc: locA1 },
  ] as const;

  const itemMap = new Map<string, string>();
  for (const it of items) {
    const created = await db.inventoryItem.create({
      data: {
        itemCode: it.code,
        sku: it.code,
        name: it.name,
        category: it.category,
        unit: it.unit,
        reorderLevel: it.reorder,
        reorderQty: it.reorder * 1.5,
        unitCost: it.cost,
        status: "active",
      },
    });
    itemMap.set(it.code, created.id);
    await db.stockLevel.create({
      data: {
        inventoryItemId: created.id,
        warehouseId: it.wh.id,
        locationId: it.loc.id,
        quantity: it.qty,
        reservedQty: 0,
        batchNumber: `BATCH-${it.code.slice(-4)}-01`,
      },
    });
    await db.stockMovement.create({
      data: {
        inventoryItemId: created.id,
        warehouseId: it.wh.id,
        type: "receipt",
        quantity: it.qty,
        notes: "Opening stock (seed)",
        performedById: userMap.get("admin@psm.gov.pk"),
      },
    });
  }

  // ── Suppliers & procurement ──
  console.log("• Suppliers & procurement");
  const suppliers = await Promise.all([
    db.supplier.create({
      data: {
        code: "SUP-001",
        name: "Sindh Industrial Supplies",
        legalName: "Sindh Industrial Supplies (Pvt) Ltd",
        category: "raw_materials",
        taxId: "NTN-1111111-1",
        email: "sales@sindhindustrial.demo",
        phone: "+92-21-34500001",
        city: "Karachi",
        contactName: "Demo Contact A",
        contactEmail: "contact.a@sindhindustrial.demo",
        rating: 4.2,
        status: "active",
      },
    }),
    db.supplier.create({
      data: {
        code: "SUP-002",
        name: "Balochistan Ore Traders",
        category: "raw_materials",
        email: "orders@bot.demo",
        phone: "+92-81-2800001",
        city: "Quetta",
        contactName: "Demo Contact B",
        rating: 3.8,
        status: "active",
      },
    }),
    db.supplier.create({
      data: {
        code: "SUP-003",
        name: "Punjab Engineering Spares",
        category: "spare_parts",
        email: "info@pes.demo",
        phone: "+92-42-3500001",
        city: "Lahore",
        contactName: "Demo Contact C",
        rating: 4.5,
        status: "active",
      },
    }),
    db.supplier.create({
      data: {
        code: "SUP-004",
        name: "Karachi Refractories Co.",
        category: "consumables",
        email: "sales@krc.demo",
        phone: "+92-21-34600002",
        city: "Karachi",
        contactName: "Demo Contact D",
        rating: 4.0,
        status: "active",
      },
    }),
  ]);

  const pr1 = await db.purchaseRequest.create({
    data: {
      requestNumber: "PR-2026-0001",
      title: "Billet feedstock replenishment",
      departmentId: deptMap.get("PROD"),
      requestedById: userMap.get("production@psm.gov.pk"),
      priority: "high",
      status: "submitted",
      totalEstimate: 46400000,
      justification: "Stock below reorder for billets",
      requiredDate: daysFromNow(21),
      items: {
        create: [
          {
            description: "Steel Billet 150mm",
            inventoryItemId: itemMap.get("RM-BILLET-150"),
            quantity: 320,
            unit: "MT",
            estimatedUnitCost: 145000,
          },
        ],
      },
    },
  });

  const pr2 = await db.purchaseRequest.create({
    data: {
      requestNumber: "PR-2026-0002",
      title: "Critical spare bearings",
      departmentId: deptMap.get("MAINT"),
      requestedById: userMap.get("maintenance@psm.gov.pk"),
      priority: "urgent",
      status: "approved",
      totalEstimate: 225000,
      justification: "Bearing stock critically low",
      requiredDate: daysFromNow(7),
      items: {
        create: [
          {
            description: "Bearing 6205-2RS",
            inventoryItemId: itemMap.get("SP-BEARING-6205"),
            quantity: 50,
            unit: "EA",
            estimatedUnitCost: 4500,
          },
        ],
      },
    },
  });

  const rfq1 = await db.rFQ.create({
    data: {
      rfqNumber: "RFQ-2026-0001",
      purchaseRequestId: pr1.id,
      supplierId: suppliers[0].id,
      title: "RFQ — Steel billets 150mm",
      status: "open",
      dueDate: daysFromNow(10),
    },
  });

  await db.quotation.create({
    data: {
      rfqId: rfq1.id,
      supplierId: suppliers[0].id,
      quoteNumber: "Q-SIS-1001",
      totalAmount: 45600000,
      currency: "PKR",
      validUntil: daysFromNow(30),
      status: "submitted",
    },
  });

  await db.rFQ.create({
    data: {
      rfqNumber: "RFQ-2026-0002",
      purchaseRequestId: pr2.id,
      supplierId: suppliers[2].id,
      title: "RFQ — Bearings 6205",
      status: "closed",
      dueDate: daysAgo(2),
    },
  });

  const po1 = await db.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0001",
      supplierId: suppliers[2].id,
      title: "Bearings emergency order",
      status: "issued",
      orderDate: daysAgo(3),
      expectedDate: daysFromNow(5),
      totalAmount: 225000,
      createdById: userMap.get("procurement@psm.gov.pk"),
      items: {
        create: [
          {
            inventoryItemId: itemMap.get("SP-BEARING-6205"),
            description: "Bearing 6205-2RS",
            quantity: 50,
            unit: "EA",
            unitPrice: 4500,
          },
        ],
      },
    },
  });

  await db.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0002",
      supplierId: suppliers[0].id,
      title: "Iron ore fines monthly",
      status: "partial",
      orderDate: daysAgo(20),
      expectedDate: daysFromNow(5),
      totalAmount: 44000000,
      createdById: userMap.get("procurement@psm.gov.pk"),
      items: {
        create: [
          {
            inventoryItemId: itemMap.get("RM-IRONORE"),
            description: "Iron Ore Fines",
            quantity: 2000,
            unit: "MT",
            unitPrice: 22000,
            receivedQty: 800,
          },
        ],
      },
    },
  });

  // ── Production ──
  console.log("• Production");
  const lineSMS = await db.productionLine.create({
    data: {
      plantId: binQasim.id,
      code: "SMS-1",
      name: "Steel Melting Shop Line 1",
      capacity: 1200,
      status: "active",
    },
  });
  const lineCCM = await db.productionLine.create({
    data: {
      plantId: binQasim.id,
      code: "CCM-1",
      name: "Continuous Casting Machine 1",
      capacity: 1000,
      status: "active",
    },
  });
  const lineRolling = await db.productionLine.create({
    data: {
      plantId: downstream.id,
      code: "RM-1",
      name: "Bar Mill Rolling Line 1",
      capacity: 800,
      status: "active",
    },
  });

  const poProd1 = await db.productionOrder.create({
    data: {
      orderNumber: "MO-2026-0001",
      productCode: "FG-REBAR-12",
      productName: "Deformed Rebar 12mm",
      productionLineId: lineRolling.id,
      plantId: downstream.id,
      targetQuantity: 500,
      actualQuantity: 412,
      unit: "MT",
      priority: "high",
      status: "in_progress",
      plannedStart: daysAgo(5),
      plannedEnd: daysFromNow(2),
      actualStart: daysAgo(5),
      efficiency: 82.4,
      yieldPercent: 94.5,
      createdById: userMap.get("production@psm.gov.pk"),
    },
  });

  await db.productionOrder.create({
    data: {
      orderNumber: "MO-2026-0002",
      productCode: "RM-BILLET-150",
      productName: "Steel Billet 150mm",
      productionLineId: lineCCM.id,
      plantId: binQasim.id,
      targetQuantity: 800,
      actualQuantity: 800,
      unit: "MT",
      status: "completed",
      plannedStart: daysAgo(15),
      plannedEnd: daysAgo(8),
      actualStart: daysAgo(15),
      actualEnd: daysAgo(8),
      efficiency: 96.2,
      yieldPercent: 97.1,
      createdById: userMap.get("production@psm.gov.pk"),
    },
  });

  await db.productionOrder.create({
    data: {
      orderNumber: "MO-2026-0003",
      productCode: "FG-HRCOIL",
      productName: "Hot Rolled Coil",
      productionLineId: lineSMS.id,
      plantId: binQasim.id,
      targetQuantity: 300,
      actualQuantity: 0,
      unit: "MT",
      status: "planned",
      plannedStart: daysFromNow(3),
      plannedEnd: daysFromNow(10),
      createdById: userMap.get("production@psm.gov.pk"),
    },
  });

  await db.productionSchedule.create({
    data: {
      productionOrderId: poProd1.id,
      productionLineId: lineRolling.id,
      shiftId: shiftA.id,
      scheduledDate: daysAgo(1),
      targetQuantity: 80,
      actualQuantity: 76,
      status: "completed",
    },
  });

  await db.materialConsumption.create({
    data: {
      productionOrderId: poProd1.id,
      inventoryItemId: itemMap.get("RM-BILLET-150")!,
      plannedQuantity: 520,
      actualQuantity: 430,
      unit: "MT",
    },
  });

  await db.productionDowntime.create({
    data: {
      productionLineId: lineRolling.id,
      startTime: daysAgo(2),
      endTime: new Date(daysAgo(2).getTime() + 90 * 60 * 1000),
      reason: "Roll changeover",
      category: "changeover",
      minutes: 90,
    },
  });

  // ── Maintenance ──
  console.log("• Maintenance");
  const eq1 = await db.equipment.create({
    data: {
      assetTag: "EQ-BF-001",
      name: "Blast Furnace #1",
      category: "production_line",
      plantId: binQasim.id,
      location: "Iron Making Area",
      manufacturer: "Demo Heavy Industries",
      model: "BF-4500",
      serialNumber: "SN-BF-4500-01",
      installationDate: daysAgo(4000),
      status: "operational",
      criticality: "critical",
    },
  });
  const eq2 = await db.equipment.create({
    data: {
      assetTag: "EQ-CCM-001",
      name: "Caster Strand Drive",
      category: "machine",
      plantId: binQasim.id,
      location: "CCM Bay",
      manufacturer: "Demo Drive Systems",
      model: "SD-200",
      status: "under_maintenance",
      criticality: "high",
    },
  });
  const eq3 = await db.equipment.create({
    data: {
      assetTag: "EQ-RM-001",
      name: "Roughing Mill Stand",
      category: "machine",
      plantId: downstream.id,
      location: "Bar Mill",
      status: "operational",
      criticality: "high",
    },
  });

  await db.maintenanceSchedule.create({
    data: {
      equipmentId: eq1.id,
      title: "Monthly BF inspection",
      type: "preventive",
      frequencyDays: 30,
      lastDoneAt: daysAgo(20),
      nextDueAt: daysFromNow(10),
    },
  });

  await db.maintenanceWorkOrder.create({
    data: {
      workOrderNumber: "WO-2026-0001",
      equipmentId: eq2.id,
      title: "Replace caster strand bearings",
      description: "Abnormal vibration detected on strand drive",
      type: "corrective",
      priority: "high",
      status: "in_progress",
      requestedById: userMap.get("production@psm.gov.pk"),
      assignedTo: "Asif Raza",
      scheduledStart: daysAgo(1),
      scheduledEnd: daysFromNow(1),
      sparePartsUsed: JSON.stringify([{ code: "SP-BEARING-6205", qty: 4 }]),
    },
  });

  await db.maintenanceWorkOrder.create({
    data: {
      workOrderNumber: "WO-2026-0002",
      equipmentId: eq3.id,
      title: "Preventive lubrication — roughing stand",
      type: "preventive",
      priority: "medium",
      status: "open",
      requestedById: userMap.get("maintenance@psm.gov.pk"),
      scheduledStart: daysFromNow(2),
    },
  });

  await db.maintenanceWorkOrder.create({
    data: {
      workOrderNumber: "WO-2026-0003",
      equipmentId: eq1.id,
      title: "Emergency cooling pump check",
      type: "emergency",
      priority: "critical",
      status: "completed",
      completedAt: daysAgo(4),
      downtimeMinutes: 45,
      assignedTo: "Shahid Nawaz",
    },
  });

  // ── Quality ──
  console.log("• Quality");
  const insp1 = await db.qualityInspection.create({
    data: {
      inspectionNumber: "QI-2026-0001",
      type: "final",
      productCode: "FG-REBAR-12",
      productName: "Deformed Rebar 12mm",
      batchNumber: "RB12-2603-01",
      requestedById: userMap.get("production@psm.gov.pk"),
      inspectorName: "Rabia Siddiqui",
      status: "passed",
      resultSummary: "Meets PS 1612 chemical and mechanical specs",
      inspectedAt: daysAgo(1),
      testResults: {
        create: [
          { parameter: "Yield Strength", specification: ">= 420 MPa", actualValue: "445", unit: "MPa", passed: true },
          { parameter: "Carbon Content", specification: "0.20-0.30%", actualValue: "0.24", unit: "%", passed: true },
        ],
      },
    },
  });

  const insp2 = await db.qualityInspection.create({
    data: {
      inspectionNumber: "QI-2026-0002",
      type: "in_process",
      productCode: "RM-BILLET-150",
      productName: "Steel Billet 150mm",
      batchNumber: "BL150-2603-08",
      inspectorName: "Iqra Bashir",
      status: "failed",
      resultSummary: "Surface cracks exceed tolerance",
      inspectedAt: daysAgo(3),
      testResults: {
        create: [
          { parameter: "Surface Defects", specification: "None critical", actualValue: "Longitudinal crack", passed: false },
        ],
      },
    },
  });

  await db.nonConformanceReport.create({
    data: {
      ncrNumber: "NCR-2026-0001",
      inspectionId: insp2.id,
      title: "Billet surface crack — strand 2",
      description: "Longitudinal surface crack detected on billet batch BL150-2603-08",
      severity: "major",
      status: "investigating",
      correctiveAction: "Adjust secondary cooling and mold powder feed rates",
    },
  });

  await db.qualityCertificate.create({
    data: {
      certificateNo: "COC-2026-0001",
      inspectionId: insp1.id,
      productName: "Deformed Rebar 12mm",
      batchNumber: "RB12-2603-01",
      issuedAt: daysAgo(1),
      status: "valid",
    },
  });

  // ── Safety ──
  console.log("• Safety");
  await db.safetyIncident.create({
    data: {
      incidentNumber: "SI-2026-0001",
      type: "near_miss",
      title: "Near-miss: unsecured gas cylinder",
      description: "Cylinder found without chain restraint near SMS bay",
      severity: "medium",
      location: "SMS Bay 2",
      plantId: binQasim.id,
      reportedById: userMap.get("safety@psm.gov.pk"),
      occurredAt: daysAgo(6),
      status: "corrective_action",
      injuredCount: 0,
      correctiveAction: "Install additional restraints and toolbox talk completed",
    },
  });

  await db.safetyIncident.create({
    data: {
      incidentNumber: "SI-2026-0002",
      type: "incident",
      title: "Minor hand laceration — packing area",
      description: "Operator cut hand while handling strapping",
      severity: "low",
      location: "Finished Goods Packing",
      plantId: binQasim.id,
      reportedById: userMap.get("employee@psm.gov.pk"),
      occurredAt: daysAgo(12),
      status: "closed",
      injuredCount: 1,
      correctiveAction: "Cut-resistant gloves made mandatory",
      closedAt: daysAgo(5),
    },
  });

  await db.safetyInspection.create({
    data: {
      inspectionNo: "SHSE-2026-0001",
      area: "Blast Furnace Cast House",
      inspectorName: "Bilal Ahmed",
      scheduledAt: daysAgo(2),
      completedAt: daysAgo(2),
      status: "completed",
      findings: "PPE compliance satisfactory; one walkway obstruction cleared",
      score: 88,
    },
  });

  // ── Finance ──
  console.log("• Finance");
  const ccProd = await db.costCenter.create({
    data: { code: "CC-PROD", name: "Production Operations" },
  });
  const ccMaint = await db.costCenter.create({
    data: { code: "CC-MAINT", name: "Maintenance" },
  });
  const ccProc = await db.costCenter.create({
    data: { code: "CC-PROC", name: "Procurement" },
  });

  await db.budget.create({
    data: {
      costCenterId: ccProd.id,
      departmentId: deptMap.get("PROD"),
      fiscalYear: year,
      category: "operations",
      allocated: 500000000,
      committed: 120000000,
      spent: 85000000,
    },
  });
  await db.budget.create({
    data: {
      costCenterId: ccMaint.id,
      departmentId: deptMap.get("MAINT"),
      fiscalYear: year,
      category: "maintenance",
      allocated: 80000000,
      committed: 15000000,
      spent: 22000000,
    },
  });
  await db.budget.create({
    data: {
      costCenterId: ccProc.id,
      departmentId: deptMap.get("PROC"),
      fiscalYear: year,
      category: "procurement",
      allocated: 350000000,
      committed: 90000000,
      spent: 110000000,
    },
  });

  await db.expense.create({
    data: {
      expenseNumber: "EXP-2026-0001",
      costCenterId: ccMaint.id,
      title: "Emergency bearing purchase",
      amount: 225000,
      category: "spares",
      status: "approved",
      incurredAt: daysAgo(3),
      requestedById: userMap.get("maintenance@psm.gov.pk"),
      approvedById: userMap.get("finance.manager@psm.gov.pk"),
    },
  });

  await db.expense.create({
    data: {
      expenseNumber: "EXP-2026-0002",
      costCenterId: ccProd.id,
      title: "Refractory lining consumables",
      amount: 1850000,
      category: "consumables",
      status: "submitted",
      incurredAt: daysAgo(1),
      requestedById: userMap.get("production@psm.gov.pk"),
    },
  });

  await db.paymentRequest.create({
    data: {
      requestNumber: "PAY-2026-0001",
      title: "Payment — Punjab Engineering Spares PO-2026-0001",
      amount: 225000,
      payee: "Punjab Engineering Spares",
      status: "pending",
      requestedById: userMap.get("procurement@psm.gov.pk"),
    },
  });

  // ── Documents ──
  console.log("• Documents");
  await db.document.create({
    data: {
      title: "PSM Safety Policy 2026",
      fileName: "psm-safety-policy-2026.pdf",
      filePath: "/documents/policy/psm-safety-policy-2026.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245000,
      category: "policy",
      accessLevel: "internal",
      uploadedById: userMap.get("safety@psm.gov.pk"),
      status: "active",
      checksum: "demo-checksum-safety-policy",
    },
  });
  await db.document.create({
    data: {
      title: "Rebar Mill SOP",
      fileName: "sop-rebar-mill.pdf",
      filePath: "/documents/sop/sop-rebar-mill.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512000,
      category: "sop",
      accessLevel: "internal",
      uploadedById: userMap.get("production@psm.gov.pk"),
    },
  });
  await db.document.create({
    data: {
      title: "Supplier contract — Sindh Industrial Supplies",
      fileName: "contract-sup-001.pdf",
      filePath: "/documents/contract/contract-sup-001.pdf",
      mimeType: "application/pdf",
      sizeBytes: 890000,
      category: "contract",
      accessLevel: "confidential",
      uploadedById: userMap.get("procurement@psm.gov.pk"),
      supplierId: suppliers[0].id,
    },
  });
  await db.document.create({
    data: {
      title: "Employee onboarding checklist — Usman Sheikh",
      fileName: "onboarding-psm-0009.pdf",
      filePath: "/documents/employee/onboarding-psm-0009.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120000,
      category: "employee",
      accessLevel: "restricted",
      uploadedById: userMap.get("hr.manager@psm.gov.pk"),
      employeeId: employeeByEmail.get("employee@psm.gov.pk"),
    },
  });

  // ── Workflows ──
  console.log("• Workflows");
  const leaveWf = await db.workflowDefinition.create({
    data: {
      code: "leave_approval",
      name: "Leave Approval",
      description: "Sequential leave request approval",
      module: "hr",
      resource: "leave",
      isActive: true,
      config: JSON.stringify({
        mode: "sequential",
        escalationHours: 48,
        steps: [
          { name: "Supervisor Review", roleCodes: ["supervisor", "department_head", "hr_manager"], actions: ["approve", "reject", "request_changes"] },
          { name: "HR Confirmation", roleCodes: ["hr_manager"], actions: ["approve", "reject"] },
        ],
      }),
    },
  });

  const prWf = await db.workflowDefinition.create({
    data: {
      code: "purchase_request_approval",
      name: "Purchase Request Approval",
      description: "Department head then procurement approval",
      module: "procurement",
      resource: "requests",
      isActive: true,
      config: JSON.stringify({
        mode: "sequential",
        escalationHours: 72,
        steps: [
          { name: "Department Head", roleCodes: ["department_head", "plant_manager"], actions: ["approve", "reject", "request_changes"] },
          { name: "Procurement Manager", roleCodes: ["procurement_manager"], actions: ["approve", "reject"] },
          { name: "Finance Review", roleCodes: ["finance_manager"], actions: ["approve", "reject"], thresholdAmount: 1000000 },
        ],
      }),
    },
  });

  await db.workflowInstance.create({
    data: {
      definitionId: leaveWf.id,
      resourceType: "leave_request",
      resourceId: "seed-leave-pending",
      status: "pending",
      currentStep: 0,
      initiatorId: userMap.get("employee@psm.gov.pk"),
      payload: JSON.stringify({ days: 3, leaveType: "AL" }),
    },
  });

  await db.workflowInstance.create({
    data: {
      definitionId: prWf.id,
      resourceType: "purchase_request",
      resourceId: pr1.id,
      status: "in_progress",
      currentStep: 0,
      initiatorId: userMap.get("production@psm.gov.pk"),
      payload: JSON.stringify({ requestNumber: "PR-2026-0001", totalEstimate: 46400000 }),
    },
  });

  // ── Notifications for admin ──
  console.log("• Notifications & settings");
  const adminId = userMap.get("admin@psm.gov.pk")!;
  await db.notification.createMany({
    data: [
      {
        userId: adminId,
        type: "inventory",
        title: "Low stock: Steel Billet 150mm",
        message: "Quantity 320 MT is below reorder level 500 MT",
        link: "/inventory/stock",
        isRead: false,
      },
      {
        userId: adminId,
        type: "approval",
        title: "Leave request pending",
        message: "Usman Sheikh requested 3 days annual leave",
        link: "/hr/leave",
        isRead: false,
      },
      {
        userId: adminId,
        type: "maintenance",
        title: "Work order in progress",
        message: "WO-2026-0001 — Replace caster strand bearings",
        link: "/maintenance/work-orders",
        isRead: false,
      },
      {
        userId: adminId,
        type: "safety",
        title: "Near-miss reported",
        message: "Unsecured gas cylinder near SMS bay",
        link: "/safety/incidents",
        isRead: true,
        readAt: daysAgo(1),
      },
      {
        userId: adminId,
        type: "system",
        title: "Seed completed",
        message: "Demo environment seeded successfully for Pakistan Steel Mills",
        link: "/dashboard",
        isRead: false,
      },
    ],
  });

  // ── System settings ──
  await db.systemSetting.createMany({
    data: [
      {
        key: "org.name",
        value: JSON.stringify("Pakistan Steel Mills"),
        category: "organization",
        updatedBy: adminId,
      },
      {
        key: "auth.password_policy",
        value: JSON.stringify({
          minLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          maxAgeDays: 90,
        }),
        category: "security",
        updatedBy: adminId,
      },
      {
        key: "auth.session_hours",
        value: JSON.stringify(8),
        category: "security",
        updatedBy: adminId,
      },
      {
        key: "auth.lockout",
        value: JSON.stringify({ maxFailed: 5, lockoutMinutes: 30 }),
        category: "security",
        updatedBy: adminId,
      },
      {
        key: "app.timezone",
        value: JSON.stringify("Asia/Karachi"),
        category: "general",
        updatedBy: adminId,
      },
      {
        key: "app.currency",
        value: JSON.stringify("PKR"),
        category: "general",
        updatedBy: adminId,
      },
    ],
  });

  // ── Audit sample ──
  console.log("• Audit logs");
  await db.auditLog.createMany({
    data: [
      {
        actorId: adminId,
        actorEmail: "admin@psm.gov.pk",
        action: "seed",
        module: "system",
        resource: "database",
        description: "Initial seed data loaded",
        integrityHash: "seed-integrity-1",
      },
      {
        actorId: userMap.get("procurement@psm.gov.pk"),
        actorEmail: "procurement@psm.gov.pk",
        action: "create",
        module: "procurement",
        resource: "orders",
        resourceId: po1.id,
        description: "Created purchase order PO-2026-0001",
        integrityHash: "seed-integrity-2",
      },
      {
        actorId: userMap.get("quality@psm.gov.pk"),
        actorEmail: "quality@psm.gov.pk",
        action: "create",
        module: "quality",
        resource: "ncrs",
        description: "Opened NCR-2026-0001",
        integrityHash: "seed-integrity-3",
      },
      {
        actorId: userMap.get("safety@psm.gov.pk"),
        actorEmail: "safety@psm.gov.pk",
        action: "create",
        module: "safety",
        resource: "incidents",
        description: "Reported near-miss SI-2026-0001",
        integrityHash: "seed-integrity-4",
      },
      {
        actorId: adminId,
        actorEmail: "admin@psm.gov.pk",
        action: "update",
        module: "settings",
        resource: "system",
        description: "Configured password policy and session hours",
        integrityHash: "seed-integrity-5",
      },
    ],
  });

  console.log("\n✅ Seed complete.");
  console.log("────────────────────────────────────");
  console.log("Default password for all users: Password@123");
  console.log("Admin login: admin@psm.gov.pk / admin");
  console.log("────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
