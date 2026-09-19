"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSystemSettingsAction } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsFormProps = {
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
  canEdit: boolean;
};

export function SettingsForm(props: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flags, setFlags] = useState({
    requireUppercase: props.passwordPolicy.requireUppercase,
    requireLowercase: props.passwordPolicy.requireLowercase,
    requireNumber: props.passwordPolicy.requireNumber,
    requireSpecial: props.passwordPolicy.requireSpecial,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!props.canEdit) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveSystemSettingsAction({
        orgName: String(fd.get("orgName")),
        passwordPolicy: {
          minLength: Number(fd.get("minLength")),
          requireUppercase: flags.requireUppercase,
          requireLowercase: flags.requireLowercase,
          requireNumber: flags.requireNumber,
          requireSpecial: flags.requireSpecial,
          maxAgeDays: Number(fd.get("maxAgeDays")),
        },
        sessionHours: Number(fd.get("sessionHours")),
        lockout: {
          maxFailed: Number(fd.get("maxFailed")),
          lockoutMinutes: Number(fd.get("lockoutMinutes")),
        },
        timezone: String(fd.get("timezone")),
        currency: String(fd.get("currency")),
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Settings saved");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              name="orgName"
              defaultValue={props.orgName}
              disabled={!props.canEdit}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={props.timezone}
              disabled={!props.canEdit}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              defaultValue={props.currency}
              disabled={!props.canEdit}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password policy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="minLength">Minimum length</Label>
            <Input
              id="minLength"
              name="minLength"
              type="number"
              min={6}
              defaultValue={props.passwordPolicy.minLength}
              disabled={!props.canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxAgeDays">Max age (days)</Label>
            <Input
              id="maxAgeDays"
              name="maxAgeDays"
              type="number"
              min={0}
              defaultValue={props.passwordPolicy.maxAgeDays}
              disabled={!props.canEdit}
            />
          </div>
          {(
            [
              ["requireUppercase", "Require uppercase"],
              ["requireLowercase", "Require lowercase"],
              ["requireNumber", "Require number"],
              ["requireSpecial", "Require special character"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={flags[key]}
                disabled={!props.canEdit}
                onCheckedChange={(v) => setFlags((f) => ({ ...f, [key]: !!v }))}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session & lockout</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sessionHours">Session hours</Label>
            <Input
              id="sessionHours"
              name="sessionHours"
              type="number"
              min={1}
              defaultValue={props.sessionHours}
              disabled={!props.canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxFailed">Max failed logins</Label>
            <Input
              id="maxFailed"
              name="maxFailed"
              type="number"
              min={1}
              defaultValue={props.lockout.maxFailed}
              disabled={!props.canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lockoutMinutes">Lockout minutes</Label>
            <Input
              id="lockoutMinutes"
              name="lockoutMinutes"
              type="number"
              min={1}
              defaultValue={props.lockout.lockoutMinutes}
              disabled={!props.canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {props.canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You have view-only access to settings.</p>
      )}
    </form>
  );
}
