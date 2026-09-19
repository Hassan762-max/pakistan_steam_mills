import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function getOrganization(user: AuthUser) {
  await requirePermission(user, P.ORGANIZATION_PLANTS_VIEW);
  return db.organization.findFirst({
    include: {
      plants: {
        include: {
          divisions: {
            include: {
              departments: {
                include: { sections: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function listPlants(user: AuthUser) {
  await requirePermission(user, P.ORGANIZATION_PLANTS_VIEW);
  return db.plant.findMany({
    include: {
      organization: true,
      _count: { select: { divisions: true, productionLines: true, warehouses: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createPlant(
  user: AuthUser,
  input: {
    organizationId: string;
    code: string;
    name: string;
    location?: string;
    city?: string;
    capacityTons?: number;
  },
) {
  await requirePermission(user, P.ORGANIZATION_PLANTS_CREATE);
  const created = await db.plant.create({ data: { ...input, status: "active" } });
  await auditMutation(user, {
    action: "create",
    module: "organization",
    resource: "plants",
    resourceId: created.id,
  });
  return created;
}

export async function updatePlant(
  user: AuthUser,
  id: string,
  input: Partial<{ name: string; location: string | null; city: string | null; capacityTons: number | null; status: string; managerId: string | null }>,
) {
  await requirePermission(user, P.ORGANIZATION_PLANTS_EDIT);
  const updated = await db.plant.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "organization",
    resource: "plants",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listDepartments(user: AuthUser, plantId?: string) {
  await requirePermission(user, P.ORGANIZATION_DEPARTMENTS_VIEW);
  return db.department.findMany({
    where: {
      ...(plantId ? { plantId } : {}),
      status: "active",
    },
    include: {
      division: true,
      sections: true,
      _count: { select: { employees: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(
  user: AuthUser,
  input: {
    code: string;
    name: string;
    description?: string;
    divisionId?: string;
    plantId?: string;
    costCenter?: string;
  },
) {
  await requirePermission(user, P.ORGANIZATION_DEPARTMENTS_CREATE);
  const created = await db.department.create({ data: { ...input, status: "active" } });
  await auditMutation(user, {
    action: "create",
    module: "organization",
    resource: "departments",
    resourceId: created.id,
  });
  return created;
}

export async function updateDepartment(
  user: AuthUser,
  id: string,
  input: Partial<{ name: string; description: string | null; status: string; headId: string | null; costCenter: string | null }>,
) {
  await requirePermission(user, P.ORGANIZATION_DEPARTMENTS_EDIT);
  const updated = await db.department.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "organization",
    resource: "departments",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function deleteDepartment(user: AuthUser, id: string) {
  await requirePermission(user, P.ORGANIZATION_DEPARTMENTS_DELETE);
  const empCount = await db.employee.count({ where: { departmentId: id } });
  if (empCount > 0) {
    throw new AuthError("VALIDATION", "Cannot delete department with assigned employees");
  }
  await db.department.delete({ where: { id } });
  await auditMutation(user, {
    action: "delete",
    module: "organization",
    resource: "departments",
    resourceId: id,
  });
  return { ok: true as const };
}

export async function listDesignations(user: AuthUser) {
  await requirePermission(user, P.ORGANIZATION_DESIGNATIONS_VIEW);
  return db.designation.findMany({
    where: { status: "active" },
    orderBy: [{ level: "desc" }, { title: "asc" }],
    include: { _count: { select: { employees: true } } },
  });
}

export async function createDesignation(
  user: AuthUser,
  input: { code: string; title: string; grade?: string; level?: number; description?: string },
) {
  await requirePermission(user, P.ORGANIZATION_DESIGNATIONS_CREATE);
  const created = await db.designation.create({
    data: { ...input, level: input.level ?? 1, status: "active" },
  });
  await auditMutation(user, {
    action: "create",
    module: "organization",
    resource: "designations",
    resourceId: created.id,
  });
  return created;
}

export async function updateDesignation(
  user: AuthUser,
  id: string,
  input: Partial<{ title: string; grade: string | null; level: number; description: string | null; status: string }>,
) {
  await requirePermission(user, P.ORGANIZATION_DESIGNATIONS_EDIT);
  const updated = await db.designation.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "organization",
    resource: "designations",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}
