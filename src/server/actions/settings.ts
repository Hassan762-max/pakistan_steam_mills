"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/service";
import * as settings from "@/server/services/settings";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function upsertSettingAction(input: {
  key: string;
  value: unknown;
  category?: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await settings.upsertSetting(actor, input);
    revalidatePath("/settings");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function saveSystemSettingsAction(input: {
  orgName: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    maxAgeDays: number;
  };
  sessionHours: number;
  lockout: { maxFailed: number; lockoutMinutes: number };
  timezone: string;
  currency: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireUser();
    await Promise.all([
      settings.upsertSetting(actor, {
        key: "org.name",
        value: input.orgName,
        category: "organization",
      }),
      settings.upsertSetting(actor, {
        key: "auth.password_policy",
        value: input.passwordPolicy,
        category: "security",
      }),
      settings.upsertSetting(actor, {
        key: "auth.session_hours",
        value: input.sessionHours,
        category: "security",
      }),
      settings.upsertSetting(actor, {
        key: "auth.lockout",
        value: input.lockout,
        category: "security",
      }),
      settings.upsertSetting(actor, {
        key: "app.timezone",
        value: input.timezone,
        category: "general",
      }),
      settings.upsertSetting(actor, {
        key: "app.currency",
        value: input.currency,
        category: "general",
      }),
    ]);
    revalidatePath("/settings");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
