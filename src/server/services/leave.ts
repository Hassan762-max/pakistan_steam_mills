import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listLeaveTypes(user: AuthUser) {
  await requirePermission(user, P.HR_LEAVE_VIEW);
  return db.leaveType.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });
}

export async function listLeaveRequests(user: AuthUser, params: ListParams & { employeeId?: string } = {}) {
  await requirePermission(user, P.HR_LEAVE_VIEW);
  const { page, pageSize, skip, sortDir } = normalizePagination(params);
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
  };
  const [items, total] = await Promise.all([
    db.leaveRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: sortDir },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        leaveType: true,
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.leaveRequest.count({ where }),
  ]);
  return paginate(items, total, page, pageSize);
}

export async function getLeaveBalances(user: AuthUser, employeeId: string, year?: number) {
  await requirePermission(user, P.HR_LEAVE_VIEW);
  return db.leaveBalance.findMany({
    where: {
      employeeId,
      year: year ?? new Date().getFullYear(),
    },
    include: { leaveType: true },
  });
}

export async function createLeaveRequest(
  user: AuthUser,
  input: {
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    days: number;
    reason?: string;
  },
) {
  await requirePermission(user, P.HR_LEAVE_CREATE);

  const balance = await db.leaveBalance.findFirst({
    where: {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      year: new Date().getFullYear(),
    },
  });
  if (balance) {
    const remaining = balance.entitled + balance.carriedForward - balance.used - balance.pending;
    if (input.days > remaining) {
      throw new AuthError("VALIDATION", "Insufficient leave balance");
    }
  }

  const created = await db.$transaction(async (tx) => {
    const req = await tx.leaveRequest.create({
      data: {
        ...input,
        requesterId: user.id,
        status: "pending",
      },
      include: { leaveType: true, employee: true },
    });
    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: balance.pending + input.days },
      });
    }
    return req;
  });

  await auditMutation(user, {
    action: "create",
    module: "hr",
    resource: "leave",
    resourceId: created.id,
  });
  return created;
}

export async function approveLeaveRequest(user: AuthUser, id: string) {
  await requirePermission(user, P.HR_LEAVE_APPROVE);
  const req = await db.leaveRequest.findUnique({ where: { id } });
  if (!req) throw new AuthError("VALIDATION", "Leave request not found");
  if (req.status !== "pending") throw new AuthError("VALIDATION", "Leave request is not pending");

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: "approved",
        approverId: user.id,
        approvedAt: new Date(),
      },
    });
    const balance = await tx.leaveBalance.findFirst({
      where: {
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        year: new Date(req.startDate).getFullYear(),
      },
    });
    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending: Math.max(0, balance.pending - req.days),
          used: balance.used + req.days,
        },
      });
    }
    return result;
  });

  await auditMutation(user, {
    action: "approve",
    module: "hr",
    resource: "leave",
    resourceId: id,
  });
  return updated;
}

export async function rejectLeaveRequest(user: AuthUser, id: string, rejectionReason?: string) {
  await requirePermission(user, P.HR_LEAVE_REJECT);
  const req = await db.leaveRequest.findUnique({ where: { id } });
  if (!req) throw new AuthError("VALIDATION", "Leave request not found");
  if (req.status !== "pending") throw new AuthError("VALIDATION", "Leave request is not pending");

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approverId: user.id,
        approvedAt: new Date(),
        rejectionReason,
      },
    });
    const balance = await tx.leaveBalance.findFirst({
      where: {
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        year: new Date(req.startDate).getFullYear(),
      },
    });
    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: Math.max(0, balance.pending - req.days) },
      });
    }
    return result;
  });

  await auditMutation(user, {
    action: "reject",
    module: "hr",
    resource: "leave",
    resourceId: id,
  });
  return updated;
}

export async function listHolidays(user: AuthUser, year?: number) {
  await requirePermission(user, P.HR_LEAVE_VIEW);
  const y = year ?? new Date().getFullYear();
  return db.holiday.findMany({
    where: {
      date: {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      },
    },
    orderBy: { date: "asc" },
  });
}
