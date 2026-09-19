import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const counts = {
    users: await db.user.count(),
    roles: await db.role.count(),
    permissions: await db.permission.count(),
    employees: await db.employee.count(),
    inventory: await db.inventoryItem.count(),
    productionOrders: await db.productionOrder.count(),
    suppliers: await db.supplier.count(),
    workOrders: await db.maintenanceWorkOrder.count(),
    notifications: await db.notification.count(),
    auditLogs: await db.auditLog.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
  await db.$disconnect();
}

main();
