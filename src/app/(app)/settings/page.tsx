import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/require-page-user";
import { listSettings } from "@/server/services/settings";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "./settings-form";

function parseSetting<T>(rows: Awaited<ReturnType<typeof listSettings>>, key: string, fallback: T): T {
  const row = rows.find((r) => r.key === key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export default async function SettingsPage() {
  const user = await requirePageUser();
  if (!hasPermission(user, P.SETTINGS_SYSTEM_VIEW)) redirect("/unauthorized");

  const rows = await withPageAuth(() => listSettings(user));
  const canEdit = hasPermission(user, P.SETTINGS_SYSTEM_EDIT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System settings"
        description="Organization identity, password policy, and session security."
      />
      <SettingsForm
        canEdit={canEdit}
        orgName={parseSetting(rows, "org.name", "Pakistan Steel Mills")}
        passwordPolicy={parseSetting(rows, "auth.password_policy", {
          minLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          maxAgeDays: 90,
        })}
        sessionHours={parseSetting(rows, "auth.session_hours", 8)}
        lockout={parseSetting(rows, "auth.lockout", { maxFailed: 5, lockoutMinutes: 30 })}
        timezone={parseSetting(rows, "app.timezone", "Asia/Karachi")}
        currency={parseSetting(rows, "app.currency", "PKR")}
      />
    </div>
  );
}
