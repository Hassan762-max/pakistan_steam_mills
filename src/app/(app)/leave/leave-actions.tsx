"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveLeaveAction,
  createLeaveRequestAction,
  rejectLeaveAction,
} from "@/server/actions/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
type Option = { id: string; label: string };

export function LeaveActions({
  canCreate,
  canApprove,
  canReject,
  leaveTypes,
  employees,
  pendingIds,
}: {
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  leaveTypes: Option[];
  employees: Option[];
  pendingIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function refreshOk(result: { ok: boolean; error?: string }, msg: string) {
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(msg);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canCreate ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Request leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request leave</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const start = String(fd.get("startDate"));
                const end = String(fd.get("endDate"));
                const days = Number(fd.get("days"));
                startTransition(async () => {
                  const result = await createLeaveRequestAction({
                    employeeId: String(fd.get("employeeId")),
                    leaveTypeId: String(fd.get("leaveTypeId")),
                    startDate: start,
                    endDate: end,
                    days,
                    reason: String(fd.get("reason") || "") || undefined,
                  });
                  refreshOk(result, "Leave request submitted");
                  if (result.ok) setOpen(false);
                });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="employeeId">Employee</Label>
                <select
                  id="employeeId"
                  name="employeeId"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select employee
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leaveTypeId">Leave type</Label>
                <select
                  id="leaveTypeId"
                  name="leaveTypeId"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select type
                  </option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End</Label>
                  <Input id="endDate" name="endDate" type="date" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="days">Days</Label>
                <Input id="days" name="days" type="number" min={0.5} step={0.5} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" rows={2} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {(canApprove || canReject) && pendingIds.length > 0 ? (
        <p className="self-center text-xs text-muted-foreground">
          Use row actions to approve or reject pending requests.
        </p>
      ) : null}
    </div>
  );
}

export function LeaveRowActions({
  id,
  status,
  canApprove,
  canReject,
}: {
  id: string;
  status: string;
  canApprove: boolean;
  canReject: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status !== "pending") return null;

  return (
    <div className="flex gap-1">
      {canApprove ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await approveLeaveAction(id);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Leave approved");
                router.refresh();
              }
            });
          }}
        >
          Approve
        </Button>
      ) : null}
      {canReject ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await rejectLeaveAction(id, "Rejected by approver");
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Leave rejected");
                router.refresh();
              }
            });
          }}
        >
          Reject
        </Button>
      ) : null}
    </div>
  );
}
