import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import {
  listPendingWorkflows,
  listWorkflowDefinitions,
} from "@/server/services/workflows";
import { WorkflowsClient } from "./workflows-client";

export default async function WorkflowsPage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.WORKFLOWS_WORKFLOWS_VIEW)) redirect("/dashboard");

  const [definitions, pending] = await Promise.all([
    listWorkflowDefinitions(user),
    listPendingWorkflows(user, { pageSize: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Approval definitions and items waiting on your decision."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Active definitions"
          value={formatNumber(definitions.length)}
          icon="GitBranch"
        />
        <StatCard title="Pending for you" value={formatNumber(pending.items.length)} />
      </div>
      <WorkflowsClient
        canApprove={hasPermission(user, P.WORKFLOWS_WORKFLOWS_APPROVE)}
        definitions={definitions.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          description: d.description,
          resourceType: `${d.module}.${d.resource}`,
          isActive: d.isActive,
        }))}
        pending={pending.items.map((i) => ({
          id: i.id,
          definitionName: i.definition.name,
          resourceType: i.resourceType,
          resourceId: i.resourceId,
          status: i.status,
          currentStep: i.currentStep,
          initiatorName: i.initiator
            ? `${i.initiator.firstName} ${i.initiator.lastName}`
            : "—",
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
