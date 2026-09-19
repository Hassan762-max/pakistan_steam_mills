"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
import { formatDate, formatNumber } from "@/lib/utils";
import {
  createProductionOrderAction,
  updateProductionOrderAction,
} from "@/server/actions/production";

export type ProductionOrderRow = {
  id: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  status: string;
  priority: string;
  targetQuantity: number;
  actualQuantity: number;
  unit: string;
  efficiency: number | null;
  lineName: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  notes: string | null;
  productionLineId: string | null;
};

export type ProductionLineRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  plantName: string | null;
  orderCount: number;
  capacity: number | null;
};

export type ProductionScheduleRow = {
  id: string;
  orderNumber: string;
  productName: string;
  lineName: string;
  scheduledDate: string;
  targetQuantity: number;
  status: string;
};

type Permissions = {
  canCreate: boolean;
  canEdit: boolean;
};

type Props = {
  orders: ProductionOrderRow[];
  lines: ProductionLineRow[];
  schedules: ProductionScheduleRow[];
  permissions: Permissions;
};

function OrderFormFields({
  form,
  setForm,
  lines,
}: {
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lines: ProductionLineRow[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="orderNumber">Order number</Label>
        <Input
          id="orderNumber"
          value={form.orderNumber ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={form.priority || "normal"}
          onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
        >
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="productCode">Product code</Label>
        <Input
          id="productCode"
          value={form.productCode ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="productName">Product name</Label>
        <Input
          id="productName"
          value={form.productName ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="targetQuantity">Target quantity</Label>
        <Input
          id="targetQuantity"
          type="number"
          min={0}
          step="any"
          value={form.targetQuantity ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, targetQuantity: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="unit">Unit</Label>
        <Input
          id="unit"
          value={form.unit ?? "MT"}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Production line</Label>
        <Select
          value={form.productionLineId || "__none__"}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, productionLineId: v === "__none__" ? "" : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {lines.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.code} — {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="plannedStart">Planned start</Label>
        <Input
          id="plannedStart"
          type="date"
          value={form.plannedStart ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, plannedStart: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="plannedEnd">Planned end</Label>
        <Input
          id="plannedEnd"
          type="date"
          value={form.plannedEnd ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, plannedEnd: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
      </div>
    </div>
  );
}

export function ProductionClient({ orders, lines, schedules, permissions }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOrder, setEditOrder] = React.useState<ProductionOrderRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<Record<string, string>>({
    unit: "MT",
    priority: "normal",
  });
  const [editForm, setEditForm] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!editOrder) return;
    setEditForm({
      targetQuantity: String(editOrder.targetQuantity),
      actualQuantity: String(editOrder.actualQuantity),
      status: editOrder.status,
      priority: editOrder.priority,
      efficiency: editOrder.efficiency != null ? String(editOrder.efficiency) : "",
      notes: editOrder.notes ?? "",
      productionLineId: editOrder.productionLineId ?? "",
      plannedStart: editOrder.plannedStart?.slice(0, 10) ?? "",
      plannedEnd: editOrder.plannedEnd?.slice(0, 10) ?? "",
    });
  }, [editOrder]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createProductionOrderAction({
      orderNumber: createForm.orderNumber,
      productCode: createForm.productCode,
      productName: createForm.productName,
      targetQuantity: Number(createForm.targetQuantity),
      unit: createForm.unit || "MT",
      priority: createForm.priority || "normal",
      productionLineId: createForm.productionLineId || undefined,
      plannedStart: createForm.plannedStart || undefined,
      plannedEnd: createForm.plannedEnd || undefined,
      notes: createForm.notes || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed to create order");
      return;
    }
    toast.success("Production order created");
    setCreateOpen(false);
    setCreateForm({ unit: "MT", priority: "normal" });
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder) return;
    setPending(true);
    const result = await updateProductionOrderAction(editOrder.id, {
      targetQuantity: Number(editForm.targetQuantity),
      actualQuantity: Number(editForm.actualQuantity),
      status: editForm.status,
      priority: editForm.priority,
      efficiency: editForm.efficiency ? Number(editForm.efficiency) : null,
      notes: editForm.notes || null,
      productionLineId: editForm.productionLineId || null,
      plannedStart: editForm.plannedStart || null,
      plannedEnd: editForm.plannedEnd || null,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed to update order");
      return;
    }
    toast.success("Order updated");
    setEditOrder(null);
    router.refresh();
  }

  const orderColumns = React.useMemo<DataTableColumnDef<ProductionOrderRow>[]>(
    () => [
      { accessorKey: "orderNumber", header: "Order #" },
      { accessorKey: "productName", header: "Product" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "lineName", header: "Line", cell: ({ row }) => row.original.lineName ?? "—" },
      {
        accessorKey: "targetQuantity",
        header: "Target",
        cell: ({ row }) =>
          `${formatNumber(row.original.targetQuantity, 1)} ${row.original.unit}`,
      },
      {
        accessorKey: "actualQuantity",
        header: "Actual",
        cell: ({ row }) =>
          `${formatNumber(row.original.actualQuantity, 1)} ${row.original.unit}`,
      },
      {
        accessorKey: "efficiency",
        header: "Efficiency",
        cell: ({ row }) =>
          row.original.efficiency != null ? `${formatNumber(row.original.efficiency, 1)}%` : "—",
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          permissions.canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditOrder(row.original)}
              aria-label="Edit order"
            >
              <Pencil className="size-4" />
            </Button>
          ) : null,
      },
    ],
    [permissions.canEdit],
  );

  const lineColumns = React.useMemo<DataTableColumnDef<ProductionLineRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "plantName", header: "Plant", cell: ({ row }) => row.original.plantName ?? "—" },
      { accessorKey: "orderCount", header: "Orders" },
      {
        accessorKey: "capacity",
        header: "Capacity",
        cell: ({ row }) =>
          row.original.capacity != null ? formatNumber(row.original.capacity, 0) : "—",
      },
    ],
    [],
  );

  const scheduleColumns = React.useMemo<DataTableColumnDef<ProductionScheduleRow>[]>(
    () => [
      { accessorKey: "orderNumber", header: "Order #" },
      { accessorKey: "productName", header: "Product" },
      { accessorKey: "lineName", header: "Line" },
      {
        accessorKey: "scheduledDate",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.scheduledDate),
      },
      {
        accessorKey: "targetQuantity",
        header: "Target",
        cell: ({ row }) => formatNumber(row.original.targetQuantity, 1),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue="orders" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="lines">Lines</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>
        {permissions.canCreate ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="accent" size="sm">
                <Plus className="size-4" />
                New order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create production order</DialogTitle>
                <DialogDescription>
                  Plan a new heat or mill run against an available line.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <OrderFormFields form={createForm} setForm={setCreateForm} lines={lines} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" disabled={pending}>
                    {pending ? "Saving…" : "Create order"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <TabsContent value="orders">
        <DataTable
          columns={orderColumns}
          data={orders}
          searchPlaceholder="Search orders…"
          emptyTitle="No production orders"
          emptyDescription="Create an order to start planning mill output."
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="lines">
        <DataTable
          columns={lineColumns}
          data={lines}
          searchPlaceholder="Search lines…"
          emptyTitle="No production lines"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="schedules">
        <DataTable
          columns={scheduleColumns}
          data={schedules}
          searchPlaceholder="Search schedules…"
          emptyTitle="No schedules"
          getRowId={(r) => r.id}
        />
      </TabsContent>

      <Dialog open={!!editOrder} onOpenChange={(o) => !o && setEditOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit order {editOrder?.orderNumber}</DialogTitle>
            <DialogDescription>Update quantities, status, and line assignment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editForm.status || "planned"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority || "normal"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editTarget">Target qty</Label>
                <Input
                  id="editTarget"
                  type="number"
                  step="any"
                  value={editForm.targetQuantity ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, targetQuantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editActual">Actual qty</Label>
                <Input
                  id="editActual"
                  type="number"
                  step="any"
                  value={editForm.actualQuantity ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, actualQuantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editEff">Efficiency %</Label>
                <Input
                  id="editEff"
                  type="number"
                  step="any"
                  value={editForm.efficiency ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, efficiency: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Line</Label>
                <Select
                  value={editForm.productionLineId || "__none__"}
                  onValueChange={(v) =>
                    setEditForm((f) => ({
                      ...f,
                      productionLineId: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {lines.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.code} — {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editForm.notes ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
