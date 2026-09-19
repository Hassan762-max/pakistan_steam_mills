import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";

export type SearchHit = {
  module: string;
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearch(user: AuthUser, query: string, limit = 8): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const hits: SearchHit[] = [];

  const tasks: Array<Promise<void>> = [];

  if (hasPermission(user, P.HR_EMPLOYEES_VIEW)) {
    tasks.push(
      db.employee
        .findMany({
          where: {
            OR: [
              { fullName: { contains: q } },
              { employeeNumber: { contains: q } },
              { email: { contains: q } },
            ],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "hr",
              type: "employee",
              id: r.id,
              title: r.fullName,
              subtitle: r.employeeNumber,
              href: `/employees/${r.id}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.USERS_USERS_VIEW)) {
    tasks.push(
      db.user
        .findMany({
          where: {
            OR: [
              { email: { contains: q } },
              { username: { contains: q } },
              { firstName: { contains: q } },
              { lastName: { contains: q } },
            ],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "users",
              type: "user",
              id: r.id,
              title: `${r.firstName} ${r.lastName}`,
              subtitle: r.email,
              href: `/users/${r.id}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.INVENTORY_STOCK_VIEW)) {
    tasks.push(
      db.inventoryItem
        .findMany({
          where: {
            OR: [{ name: { contains: q } }, { itemCode: { contains: q } }, { sku: { contains: q } }],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "inventory",
              type: "item",
              id: r.id,
              title: r.name,
              subtitle: r.itemCode,
              href: `/inventory?q=${encodeURIComponent(r.itemCode)}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.PRODUCTION_ORDERS_VIEW)) {
    tasks.push(
      db.productionOrder
        .findMany({
          where: {
            OR: [
              { orderNumber: { contains: q } },
              { productName: { contains: q } },
              { productCode: { contains: q } },
            ],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "production",
              type: "order",
              id: r.id,
              title: r.orderNumber,
              subtitle: r.productName,
              href: `/production?q=${encodeURIComponent(r.orderNumber)}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.PROCUREMENT_ORDERS_VIEW)) {
    tasks.push(
      db.purchaseOrder
        .findMany({
          where: {
            OR: [{ poNumber: { contains: q } }, { title: { contains: q } }],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "procurement",
              type: "purchase_order",
              id: r.id,
              title: r.poNumber,
              subtitle: r.title,
              href: `/procurement?q=${encodeURIComponent(r.poNumber)}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.SUPPLIERS_SUPPLIERS_VIEW)) {
    tasks.push(
      db.supplier
        .findMany({
          where: {
            OR: [{ name: { contains: q } }, { code: { contains: q } }],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "suppliers",
              type: "supplier",
              id: r.id,
              title: r.name,
              subtitle: r.code,
              href: `/suppliers/${r.id}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.MAINTENANCE_EQUIPMENT_VIEW)) {
    tasks.push(
      db.equipment
        .findMany({
          where: {
            OR: [{ name: { contains: q } }, { assetTag: { contains: q } }],
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "maintenance",
              type: "equipment",
              id: r.id,
              title: r.name,
              subtitle: r.assetTag,
              href: `/maintenance?q=${encodeURIComponent(r.assetTag)}`,
            });
          }
        }),
    );
  }

  if (hasPermission(user, P.DOCUMENTS_DOCUMENTS_VIEW)) {
    tasks.push(
      db.document
        .findMany({
          where: {
            OR: [{ title: { contains: q } }, { fileName: { contains: q } }],
            status: "active",
          },
          take: limit,
        })
        .then((rows) => {
          for (const r of rows) {
            hits.push({
              module: "documents",
              type: "document",
              id: r.id,
              title: r.title,
              subtitle: r.category,
              href: `/documents?q=${encodeURIComponent(r.title)}`,
            });
          }
        }),
    );
  }

  await Promise.all(tasks);
  return hits.slice(0, limit * 2);
}
