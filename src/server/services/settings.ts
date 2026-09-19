import { db } from "@/server/db";
import type { AuthUser } from "@/server/auth/service";
import { AuthError } from "@/server/auth/service";
import { requirePermission } from "@/server/authorization/rbac";
import { auditMutation } from "@/server/services/_helpers";
import { P } from "@/lib/permissions";

export async function listSettings(user: AuthUser, category?: string) {
  await requirePermission(user, P.SETTINGS_SYSTEM_VIEW);
  return db.systemSetting.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

export async function getSetting(user: AuthUser, key: string) {
  await requirePermission(user, P.SETTINGS_SYSTEM_VIEW);
  const setting = await db.systemSetting.findUnique({ where: { key } });
  if (!setting) throw new AuthError("VALIDATION", "Setting not found");
  return {
    ...setting,
    parsedValue: JSON.parse(setting.value) as unknown,
  };
}

export async function upsertSetting(
  user: AuthUser,
  input: { key: string; value: unknown; category?: string },
) {
  await requirePermission(user, P.SETTINGS_SYSTEM_EDIT);
  const value = JSON.stringify(input.value);
  const before = await db.systemSetting.findUnique({ where: { key: input.key } });

  const setting = await db.systemSetting.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      value,
      category: input.category ?? "general",
      updatedBy: user.id,
    },
    update: {
      value,
      category: input.category,
      updatedBy: user.id,
    },
  });

  await auditMutation(user, {
    action: before ? "update" : "create",
    module: "settings",
    resource: "system",
    resourceId: setting.id,
    beforeValue: before ? { key: before.key, value: before.value } : undefined,
    afterValue: { key: setting.key, value: setting.value },
  });

  return setting;
}

export async function getPublicAppSettings() {
  const keys = ["org.name", "app.timezone", "app.currency"];
  const rows = await db.systemSetting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}
