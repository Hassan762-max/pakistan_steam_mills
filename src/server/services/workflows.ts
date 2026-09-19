import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission, hasAnyPermission } from "@/server/authorization/rbac";
import { auditMutation, normalizePagination, paginate, type ListParams } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

type WorkflowConfig = {
  mode?: "sequential" | "parallel";
  escalationHours?: number;
  steps: Array<{
    name: string;
    roleCodes?: string[];
    userIds?: string[];
    actions?: string[];
    thresholdAmount?: number;
  }>;
};

function parseConfig(raw: string): WorkflowConfig {
  return JSON.parse(raw) as WorkflowConfig;
}

export async function listWorkflowDefinitions(user: AuthUser) {
  await requirePermission(user, P.WORKFLOWS_WORKFLOWS_VIEW);
  return db.workflowDefinition.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function startWorkflowInstance(
  user: AuthUser,
  input: {
    definitionCode: string;
    resourceType: string;
    resourceId: string;
    payload?: unknown;
  },
) {
  await requirePermission(user, P.WORKFLOWS_WORKFLOWS_CREATE);

  const definition = await db.workflowDefinition.findUnique({
    where: { code: input.definitionCode },
  });
  if (!definition || !definition.isActive) {
    throw new AuthError("VALIDATION", "Workflow definition not found or inactive");
  }

  const existing = await db.workflowInstance.findFirst({
    where: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: { in: ["pending", "in_progress", "changes_requested"] },
    },
  });
  if (existing) {
    throw new AuthError("VALIDATION", "An active workflow already exists for this resource");
  }

  const instance = await db.workflowInstance.create({
    data: {
      definitionId: definition.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: "pending",
      currentStep: 0,
      initiatorId: user.id,
      payload: input.payload ? JSON.stringify(input.payload) : null,
    },
    include: { definition: true },
  });

  await auditMutation(user, {
    action: "start",
    module: "workflows",
    resource: "workflows",
    resourceId: instance.id,
    afterValue: {
      definitionCode: input.definitionCode,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
  });

  return instance;
}

export async function actOnWorkflow(
  user: AuthUser,
  instanceId: string,
  input: {
    action: "approve" | "reject" | "request_changes" | "comment" | "delegate";
    comments?: string;
    delegatedTo?: string;
  },
) {
  await requirePermission(user, P.WORKFLOWS_WORKFLOWS_APPROVE);

  const instance = await db.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { definition: true, actions: { orderBy: { createdAt: "asc" } } },
  });
  if (!instance) throw new AuthError("VALIDATION", "Workflow instance not found");
  if (["approved", "rejected", "cancelled"].includes(instance.status)) {
    throw new AuthError("VALIDATION", "Workflow is already completed");
  }

  const config = parseConfig(instance.definition.config);
  const step = config.steps[instance.currentStep];
  if (!step) throw new AuthError("VALIDATION", "Invalid workflow step");

  const userRoleCodes = user.roles.map((r) => r.code);
  const allowedByRole =
    !step.roleCodes?.length ||
    step.roleCodes.some((c) => userRoleCodes.includes(c)) ||
    userRoleCodes.includes("super_admin");
  const allowedByUser = !step.userIds?.length || step.userIds.includes(user.id);
  if (!allowedByRole && !allowedByUser) {
    throw new AuthError("UNAUTHORIZED", "You are not an approver for this step");
  }

  if (step.actions?.length && !step.actions.includes(input.action) && input.action !== "comment") {
    throw new AuthError("VALIDATION", `Action '${input.action}' is not allowed on this step`);
  }

  if (input.action === "delegate" && !input.delegatedTo) {
    throw new AuthError("VALIDATION", "delegatedTo is required for delegate action");
  }

  await db.workflowAction.create({
    data: {
      instanceId,
      stepIndex: instance.currentStep,
      actorId: user.id,
      action: input.action,
      comments: input.comments,
      delegatedTo: input.delegatedTo,
    },
  });

  let nextStatus = instance.status === "pending" ? "in_progress" : instance.status;
  let nextStep = instance.currentStep;
  let completedAt: Date | null = null;

  if (input.action === "reject") {
    nextStatus = "rejected";
    completedAt = new Date();
  } else if (input.action === "request_changes") {
    nextStatus = "changes_requested";
  } else if (input.action === "approve") {
    const isLast = instance.currentStep >= config.steps.length - 1;
    if (isLast) {
      nextStatus = "approved";
      completedAt = new Date();
    } else {
      nextStep = instance.currentStep + 1;
      nextStatus = "in_progress";
    }
  }

  const updated = await db.workflowInstance.update({
    where: { id: instanceId },
    data: {
      status: nextStatus,
      currentStep: nextStep,
      completedAt,
    },
    include: { definition: true, actions: { orderBy: { createdAt: "asc" } } },
  });

  await auditMutation(user, {
    action: input.action,
    module: "workflows",
    resource: "workflows",
    resourceId: instanceId,
    afterValue: { status: nextStatus, currentStep: nextStep },
  });

  return updated;
}

export async function listPendingWorkflows(user: AuthUser, params: ListParams = {}) {
  await requirePermission(user, P.WORKFLOWS_WORKFLOWS_VIEW);
  const { page, pageSize, skip } = normalizePagination(params);

  const roleCodes = user.roles.map((r) => r.code);
  const definitions = await db.workflowDefinition.findMany({ where: { isActive: true } });

  const matchingDefIds = definitions
    .filter((d) => {
      const config = parseConfig(d.config);
      return config.steps.some(
        (step) =>
          step.roleCodes?.some((c) => roleCodes.includes(c)) ||
          step.userIds?.includes(user.id) ||
          roleCodes.includes("super_admin"),
      );
    })
    .map((d) => d.id);

  const where = {
    status: { in: ["pending", "in_progress", "changes_requested"] },
    definitionId: { in: matchingDefIds },
  };

  const [items, total] = await Promise.all([
    db.workflowInstance.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        definition: true,
        initiator: { select: { id: true, email: true, firstName: true, lastName: true } },
        actions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    db.workflowInstance.count({ where }),
  ]);

  // Filter to instances where current step matches user
  const filtered = items.filter((inst) => {
    if (roleCodes.includes("super_admin")) return true;
    const config = parseConfig(inst.definition.config);
    const step = config.steps[inst.currentStep];
    if (!step) return false;
    return (
      step.roleCodes?.some((c) => roleCodes.includes(c)) ||
      step.userIds?.includes(user.id)
    );
  });

  // If we filtered in-memory, adjust — for simplicity return filtered page slice
  if (!hasAnyPermission(user, [P.WORKFLOWS_WORKFLOWS_APPROVE]) && !roleCodes.includes("super_admin")) {
    return paginate(filtered, filtered.length, page, pageSize);
  }

  return paginate(filtered.length ? filtered : items, total, page, pageSize);
}
