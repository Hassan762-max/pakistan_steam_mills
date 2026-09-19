import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { P } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { requirePageUser } from "@/lib/require-page-user";
import { hasPermission } from "@/server/authorization/rbac";
import {
  listInventoryItems,
  listStockMovements,
  listWarehouses,
} from "@/server/services/inventory";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.INVENTORY_STOCK_VIEW)) redirect("/dashboard");

  const [itemsResult, warehouses, movementsResult] = await Promise.all([
    listInventoryItems(user, { pageSize: 100 }),
    hasPermission(user, P.INVENTORY_WAREHOUSES_VIEW)
      ? listWarehouses(user)
      : Promise.resolve([]),
    hasPermission(user, P.INVENTORY_MOVEMENTS_VIEW)
      ? listStockMovements(user, { pageSize: 100 })
      : Promise.resolve({ items: [] }),
  ]);

  const stock = itemsResult.items.map((item) => {
    const quantity = item.stock.reduce((s, sl) => s + sl.quantity, 0);
    return {
      id: item.id,
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      isLow: quantity < item.reorderLevel,
      warehouses: item.stock.map((s) => s.warehouse.name).join(", ") || "—",
    };
  });

  const lowCount = stock.filter((s) => s.isLow).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, warehouses, and material movements across the mills."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Active SKUs" value={formatNumber(stock.length)} icon="Boxes" />
        <StatCard
          title="Low stock alerts"
          value={formatNumber(lowCount)}
          description="Below reorder level"
          icon="AlertTriangle"
        />
        <StatCard
          title="Warehouses"
          value={formatNumber(warehouses.length)}
          icon="Warehouse"
        />
      </div>

      <InventoryClient
        canAdjust={hasPermission(user, P.INVENTORY_STOCK_EDIT)}
        stock={stock}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          type: w.type,
          plantName: w.plant?.name ?? null,
          stockCount: w._count.stock,
        }))}
        movements={movementsResult.items.map((m) => ({
          id: m.id,
          itemCode: m.item.itemCode,
          itemName: m.item.name,
          warehouseName: m.warehouse.name,
          type: m.type,
          quantity: m.quantity,
          notes: m.notes,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
