"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, MessageSquare, X } from "lucide-react";
import type { DataTableColumnDef } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { EntityStatus } from "@/components/ops/entity-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/utils";
import { actOnWorkflowAction } from "@/server/actions/workflows";

export type DefinitionRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  resourceType: string;
  isActive: boolean;
};

export type InstanceRow = {
  id: string;
  definitionName: string;
  resourceType: string;
  resourceId: string;
  status: string;
  currentStep: number;
  initiatorName: string;
  createdAt: string;
};

type Props = {
  definitions: DefinitionRow[];
  pending: InstanceRow[];
  canApprove: boolean;
};

export function WorkflowsClient({ definitions, pending, canApprove }: Props) {
  const router = useRouter();
  const [commentFor, setCommentFor] = React.useState<InstanceRow | null>(null);
  const [comment, setComment] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function act(
    id: string,
    action: "approve" | "reject" | "comment",
    comments?: string,
  ) {
    setPendingId(id);
    const result = await actOnWorkflowAction(id, { action, comments });
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Action failed");
      return;
    }
    toast.success(
      action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Comment added",
    );
    setCommentFor(null);
    setComment("");
    router.refresh();
  }

  const defColumns = React.useMemo<DataTableColumnDef<DefinitionRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "resourceType", header: "Resource" },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => row.original.description ?? "—",
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <EntityStatus status={row.original.isActive ? "active" : "inactive"} />
        ),
      },
    ],
    [],
  );

  const pendingColumns = React.useMemo<DataTableColumnDef<InstanceRow>[]>(
    () => [
      { accessorKey: "definitionName", header: "Workflow" },
      { accessorKey: "resourceType", header: "Type" },
      {
        accessorKey: "resourceId",
        header: "Resource",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.resourceId.slice(0, 10)}…</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "currentStep", header: "Step" },
      { accessorKey: "initiatorName", header: "Initiator" },
      {
        accessorKey: "createdAt",
        header: "Started",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          canApprove ? (
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pendingId === row.original.id}
                onClick={() => act(row.original.id, "approve")}
                aria-label="Approve"
              >
                <Check className="size-4 text-success" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pendingId === row.original.id}
                onClick={() => act(row.original.id, "reject")}
                aria-label="Reject"
              >
                <X className="size-4 text-destructive" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setCommentFor(row.original)}
                aria-label="Comment"
              >
                <MessageSquare className="size-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [canApprove, pendingId],
  );

  return (
    <>
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="definitions">Definitions</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <DataTable
            columns={pendingColumns}
            data={pending}
            searchPlaceholder="Search pending…"
            emptyTitle="No pending approvals"
            emptyDescription="Workflow items assigned to your roles will appear here."
            getRowId={(r) => r.id}
          />
        </TabsContent>
        <TabsContent value="definitions">
          <DataTable
            columns={defColumns}
            data={definitions}
            searchPlaceholder="Search definitions…"
            emptyTitle="No workflow definitions"
            getRowId={(r) => r.id}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!commentFor} onOpenChange={(o) => !o && setCommentFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="wf-comment">Comment</Label>
            <Textarea
              id="wf-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCommentFor(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!comment.trim() || !commentFor}
              onClick={() => commentFor && act(commentFor.id, "comment", comment.trim())}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
