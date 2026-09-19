import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";
import { fullName } from "@/lib/utils";

export type EmployeeListParams = ListParams & {
  departmentId?: string;
  plantId?: string;
  designationId?: string;
  employmentStatus?: string;
};

export async function listEmployees(user: AuthUser, params: EmployeeListParams = {}) {
  await requirePermission(user, P.HR_EMPLOYEES_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const search = params.search?.trim();

  const where = {
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
    ...(params.plantId ? { plantId: params.plantId } : {}),
    ...(params.designationId ? { designationId: params.designationId } : {}),
    ...(params.employmentStatus || params.status
      ? { employmentStatus: params.employmentStatus ?? params.status }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search } },
            { employeeNumber: { contains: search } },
            { email: { contains: search } },
            { cnic: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.employee.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: params.sortBy === "employeeNumber" ? { employeeNumber: sortDir } : { fullName: sortDir },
      include: {
        department: true,
        designation: true,
        supervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        user: { select: { id: true, email: true, status: true } },
      },
    }),
    db.employee.count({ where }),
  ]);

  return paginate(items, total, page, pageSize);
}

export async function getEmployee(user: AuthUser, id: string) {
  await requirePermission(user, P.HR_EMPLOYEES_VIEW);
  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      designation: true,
      supervisor: true,
      subordinates: { select: { id: true, fullName: true, employeeNumber: true } },
      user: { select: { id: true, email: true, username: true, status: true } },
      leaveBalances: { include: { leaveType: true } },
      shiftAssignments: { include: { shift: true }, orderBy: { effectiveFrom: "desc" }, take: 5 },
      documents: { take: 20, orderBy: { createdAt: "desc" } },
    },
  });
  if (!employee) throw new AuthError("VALIDATION", "Employee not found");
  return employee;
}

export async function createEmployee(
  user: AuthUser,
  input: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    departmentId?: string;
    designationId?: string;
    plantId?: string;
    supervisorId?: string;
    employmentType?: string;
    grade?: string;
    joiningDate?: Date;
    cnic?: string;
    gender?: string;
    city?: string;
    address?: string;
  },
) {
  await requirePermission(user, P.HR_EMPLOYEES_CREATE);
  const existing = await db.employee.findUnique({ where: { employeeNumber: input.employeeNumber } });
  if (existing) throw new AuthError("VALIDATION", "Employee number already exists");

  const created = await db.employee.create({
    data: {
      employeeNumber: input.employeeNumber.trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fullName: fullName(input.firstName, input.lastName),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone,
      departmentId: input.departmentId,
      designationId: input.designationId,
      plantId: input.plantId,
      supervisorId: input.supervisorId,
      employmentType: input.employmentType ?? "permanent",
      employmentStatus: "active",
      grade: input.grade,
      joiningDate: input.joiningDate ?? new Date(),
      cnic: input.cnic,
      gender: input.gender,
      city: input.city,
      address: input.address,
    },
    include: { department: true, designation: true },
  });

  await auditMutation(user, {
    action: "create",
    module: "hr",
    resource: "employees",
    resourceId: created.id,
    afterValue: { employeeNumber: created.employeeNumber, fullName: created.fullName },
  });

  return created;
}

export async function updateEmployee(
  user: AuthUser,
  id: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    departmentId: string | null;
    designationId: string | null;
    plantId: string | null;
    supervisorId: string | null;
    employmentType: string;
    employmentStatus: string;
    grade: string | null;
    city: string | null;
    address: string | null;
    endDate: Date | null;
  }>,
) {
  await requirePermission(user, P.HR_EMPLOYEES_EDIT);
  const before = await db.employee.findUnique({ where: { id } });
  if (!before) throw new AuthError("VALIDATION", "Employee not found");

  const firstName = input.firstName?.trim() ?? before.firstName;
  const lastName = input.lastName?.trim() ?? before.lastName;

  const updated = await db.employee.update({
    where: { id },
    data: {
      ...input,
      firstName,
      lastName,
      fullName: fullName(firstName, lastName),
      email: input.email === undefined ? undefined : input.email?.trim().toLowerCase() ?? null,
    },
    include: { department: true, designation: true },
  });

  await auditMutation(user, {
    action: "update",
    module: "hr",
    resource: "employees",
    resourceId: id,
    beforeValue: { fullName: before.fullName, departmentId: before.departmentId },
    afterValue: { fullName: updated.fullName, departmentId: updated.departmentId },
  });

  return updated;
}
