import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listAttendance(user: AuthUser, params: ListParams & { employeeId?: string; from?: Date; to?: Date } = {}) {
  await requirePermission(user, P.HR_ATTENDANCE_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);
  const where = {
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.from || params.to
      ? {
          date: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.attendanceRecord.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        shift: true,
      },
    }),
    db.attendanceRecord.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function recordAttendance(
  user: AuthUser,
  input: {
    employeeId: string;
    date: Date;
    shiftId?: string;
    checkIn?: Date;
    checkOut?: Date;
    status?: string;
    lateMinutes?: number;
    overtimeMinutes?: number;
    notes?: string;
  },
) {
  await requirePermission(user, P.HR_ATTENDANCE_CREATE);
  const day = new Date(input.date);
  day.setHours(0, 0, 0, 0);

  const created = await db.attendanceRecord.upsert({
    where: {
      employeeId_date: { employeeId: input.employeeId, date: day },
    },
    create: {
      employeeId: input.employeeId,
      userId: user.id,
      date: day,
      shiftId: input.shiftId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: input.status ?? "present",
      lateMinutes: input.lateMinutes ?? 0,
      overtimeMinutes: input.overtimeMinutes ?? 0,
      notes: input.notes,
    },
    update: {
      shiftId: input.shiftId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: input.status,
      lateMinutes: input.lateMinutes,
      overtimeMinutes: input.overtimeMinutes,
      notes: input.notes,
    },
  });

  await auditMutation(user, {
    action: "record",
    module: "hr",
    resource: "attendance",
    resourceId: created.id,
  });
  return created;
}

export async function updateAttendance(
  user: AuthUser,
  id: string,
  input: Partial<{
    checkIn: Date | null;
    checkOut: Date | null;
    status: string;
    lateMinutes: number;
    overtimeMinutes: number;
    notes: string | null;
    shiftId: string | null;
  }>,
) {
  await requirePermission(user, P.HR_ATTENDANCE_EDIT);
  const existing = await db.attendanceRecord.findUnique({ where: { id } });
  if (!existing) throw new AuthError("VALIDATION", "Attendance record not found");

  const updated = await db.attendanceRecord.update({ where: { id }, data: input });
  await auditMutation(user, {
    action: "update",
    module: "hr",
    resource: "attendance",
    resourceId: id,
    afterValue: input,
  });
  return updated;
}

export async function listShifts(user: AuthUser) {
  await requirePermission(user, P.HR_ATTENDANCE_VIEW);
  return db.shift.findMany({ where: { status: "active" }, orderBy: { code: "asc" } });
}
