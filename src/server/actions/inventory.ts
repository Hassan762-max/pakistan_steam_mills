"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import { adjustStock, createInventoryItem, createWarehouse } from "@/server/services/inventory";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function adjustStockAction(input: {
  inventoryItemId: string;
  warehouseId: string;
  quantityDelta: number;
  type?: "adjustment" | "receipt" | "issue";
  notes?: string;
  batchNumber?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await adjustStock(user, input);
    revalidatePath("/inventory");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createInventoryItemAction(input: {
  itemCode: string;
  name: string;
  category: string;
  unit?: string;
  reorderLevel?: number;
  reorderQty?: number;
  unitCost?: number;
  sku?: string;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createInventoryItem(user, input);
    revalidatePath("/inventory");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}

export async function createWarehouseAction(input: {
  code: string;
  name: string;
  type?: string;
  plantId?: string;
  location?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const created = await createWarehouse(user, input);
    revalidatePath("/inventory");
    return ok({ id: created.id });
  } catch (error) {
    return fail(error);
  }
}
