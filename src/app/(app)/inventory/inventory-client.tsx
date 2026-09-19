"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackagePlus, SlidersHorizontal } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { adjustStockAction } from "@/server/actions/inventory";

export type StockRow = {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number | null;
  isLow: boolean;
  warehouses: string;
};

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  plantName: string | null;
  stockCount: number;
};

export type MovementRow = {
  id: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  type: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
};

type Props = {
  stock: StockRow[];
  warehouses: WarehouseRow[];
  movements: MovementRow[];
  canAdjust: boolean;
};

export function InventoryClient({ stock, warehouses, movements, canAdjust }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [itemId, setItemId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [delta, setDelta] = React.useState("");
  const [type, setType] = React.useState<"adjustment" | "receipt" | "issue">("adjustment");
  const [notes, setNotes] = React.useState("");

  async function onAdjust(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await adjustStockAction({
      inventoryItemId: itemId,
      warehouseId,
      quantityDelta: Number(delta),
      type,
      notes: notes || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Adjustment failed");
      return;
    }
    toast.success("Stock adjusted");
    setOpen(false);
    setDelta("");
    setNotes("");
    router.refresh();
  }

  const stockColumns = React.useMemo<DataTableColumnDef<StockRow>[]>(
    () => [
      { accessorKey: "itemCode", header: "Code" },
      { accessorKey: "name", header: "Item" },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "quantity",
        header: "On hand",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            {formatNumber(row.original.quantity, 1)} {row.original.unit}
            {row.original.isLow ? (
              <Badge variant="destructive" className="text-[10px]">
                Low
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "reorderLevel",
        header: "Reorder",
        cell: ({ row }) => formatNumber(row.original.reorderLevel, 1),
      },
      {
        accessorKey: "unitCost",
        header: "Unit cost",
        cell: ({ row }) => formatCurrency(row.original.unitCost),
      },
      { accessorKey: "warehouses", header: "Warehouses" },
    ],
    [],
  );

  const warehouseColumns = React.useMemo<DataTableColumnDef<WarehouseRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "plantName",
        header: "Plant",
        cell: ({ row }) => row.original.plantName ?? "—",
      },
      { accessorKey: "stockCount", header: "SKU lines" },
    ],
    [],
  );

  const movementColumns = React.useMemo<DataTableColumnDef<MovementRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      { accessorKey: "itemCode", header: "Item" },
      { accessorKey: "itemName", header: "Name" },
      { accessorKey: "warehouseName", header: "Warehouse" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <EntityStatus status={row.original.type} />,
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => formatNumber(row.original.quantity, 1),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => row.original.notes ?? "—",
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue="stock" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="stock">Stock levels</TabsTrigger>
          <TabsTrigger value="alerts">Low stock</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>
        {canAdjust ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="accent" size="sm">
                <SlidersHorizontal className="size-4" />
                Adjust stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust stock</DialogTitle>
                <DialogDescription>
                  Record a receipt, issue, or quantity correction. Negative deltas issue stock.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onAdjust} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Item</Label>
                  <Select value={itemId} onValueChange={setItemId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {stock.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.itemCode} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Warehouse</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.code} — {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={type}
                      onValueChange={(v) => setType(v as typeof type)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                        <SelectItem value="receipt">Receipt</SelectItem>
                        <SelectItem value="issue">Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="delta">Quantity delta</Label>
                    <Input
                      id="delta"
                      type="number"
                      step="any"
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" disabled={pending || !itemId || !warehouseId}>
                    {pending ? "Saving…" : "Apply"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <TabsContent value="stock">
        <DataTable
          columns={stockColumns}
          data={stock}
          searchPlaceholder="Search inventory…"
          emptyTitle="No inventory items"
          emptyDescription="Seeded stock will appear here."
          getRowId={(r) => r.id}
          toolbar={
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <PackagePlus className="size-3.5" />
              {stock.filter((s) => s.isLow).length} below reorder
            </span>
          }
        />
      </TabsContent>
      <TabsContent value="alerts">
        <DataTable
          columns={stockColumns}
          data={stock.filter((s) => s.isLow)}
          searchPlaceholder="Search low stock…"
          emptyTitle="No low-stock alerts"
          emptyDescription="All items are above reorder level."
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="warehouses">
        <DataTable
          columns={warehouseColumns}
          data={warehouses}
          searchPlaceholder="Search warehouses…"
          emptyTitle="No warehouses"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="movements">
        <DataTable
          columns={movementColumns}
          data={movements}
          searchPlaceholder="Search movements…"
          emptyTitle="No movements yet"
          getRowId={(r) => r.id}
        />
      </TabsContent>
    </Tabs>
  );
}
