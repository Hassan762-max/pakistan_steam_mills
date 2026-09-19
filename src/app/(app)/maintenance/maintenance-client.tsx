"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { DataTableColumnDef } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { EntityStatus } from "@/components/ops/entity-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { createWorkOrderAction } from "@/server/actions/maintenance";

export type EquipmentRow = {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  criticality: string;
  plantName: string | null;
  location: string | null;
  workOrderCount: number;
};

export type WorkOrderRow = {
  id: string;
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  equipmentName: string;
  equipmentId: string;
  scheduledStart: string | null;
};

type Props = {
  equipment: EquipmentRow[];
  workOrders: WorkOrderRow[];
  canCreateWo: boolean;
};

export function MaintenanceClient({ equipment, workOrders, canCreateWo }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    workOrderNumber: "",
    equipmentId: "",
    title: "",
    description: "",
    type: "corrective",
    priority: "medium",
  });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createWorkOrderAction({
      workOrderNumber: form.workOrderNumber,
      equipmentId: form.equipmentId,
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      priority: form.priority,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed to create work order");
      return;
    }
    toast.success("Work order created");
    setOpen(false);
    setForm({
      workOrderNumber: "",
      equipmentId: "",
      title: "",
      description: "",
      type: "corrective",
      priority: "medium",
    });
    router.refresh();
  }

  const eqColumns = React.useMemo<DataTableColumnDef<EquipmentRow>[]>(
    () => [
      { accessorKey: "assetTag", header: "Asset tag" },
      { accessorKey: "name", header: "Equipment" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "criticality", header: "Criticality" },
      {
        accessorKey: "plantName",
        header: "Plant",
        cell: ({ row }) => row.original.plantName ?? "—",
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => row.original.location ?? "—",
      },
      { accessorKey: "workOrderCount", header: "WOs" },
    ],
    [],
  );

  const woColumns = React.useMemo<DataTableColumnDef<WorkOrderRow>[]>(
    () => [
      { accessorKey: "workOrderNumber", header: "WO #" },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "equipmentName", header: "Equipment" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "priority", header: "Priority" },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "scheduledStart",
        header: "Scheduled",
        cell: ({ row }) => formatDate(row.original.scheduledStart),
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue="work_orders" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="work_orders">Work orders</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>
        {canCreateWo ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="accent" size="sm">
                <Plus className="size-4" />
                Create work order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New work order</DialogTitle>
                <DialogDescription>
                  Raise corrective or preventive maintenance against an asset.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="wo">WO number</Label>
                    <Input
                      id="wo"
                      value={form.workOrderNumber}
                      onChange={(e) => setForm((f) => ({ ...f, workOrderNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Equipment</Label>
                    <Select
                      value={form.equipmentId}
                      onValueChange={(v) => setForm((f) => ({ ...f, equipmentId: v }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.assetTag} — {eq.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrective">Corrective</SelectItem>
                        <SelectItem value="preventive">Preventive</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea
                      id="desc"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={pending || !form.equipmentId}
                  >
                    {pending ? "Saving…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <TabsContent value="work_orders">
        <DataTable
          columns={woColumns}
          data={workOrders}
          searchPlaceholder="Search work orders…"
          emptyTitle="No work orders"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="equipment">
        <DataTable
          columns={eqColumns}
          data={equipment}
          searchPlaceholder="Search equipment…"
          emptyTitle="No equipment"
          getRowId={(r) => r.id}
        />
      </TabsContent>
    </Tabs>
  );
}
