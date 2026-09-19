"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { assignPermissionsAction, updateRoleAction } from "@/server/actions/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Permission = {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
  name: string;
};

export function RoleEditor({
  roleId,
  name,
  description,
  code,
  isSystem,
  locked,
  canEdit,
  canAssign,
  allPermissions,
  assignedPermissionIds,
}: {
  roleId: string;
  name: string;
  description: string | null;
  code: string;
  isSystem: boolean;
  locked: boolean;
  canEdit: boolean;
  canAssign: boolean;
  allPermissions: Permission[];
  assignedPermissionIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(assignedPermissionIds);

  const matrix = useMemo(() => {
    const modules: Record<string, Record<string, Permission[]>> = {};
    for (const p of allPermissions) {
      modules[p.module] ??= {};
      modules[p.module][p.resource] ??= [];
      modules[p.module][p.resource].push(p);
    }
    return modules;
  }, [allPermissions]);

  function toggle(id: string) {
    if (locked || !canAssign) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateRoleAction(roleId, {
        name: String(fd.get("name")),
        description: String(fd.get("description") || "") || null,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Role updated");
        router.refresh();
      }
    });
  }

  function savePermissions() {
    startTransition(async () => {
      const result = await assignPermissionsAction(roleId, selected);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Permissions saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveDetails} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={name} disabled={!canEdit} required />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} disabled />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={description ?? ""}
                disabled={!canEdit}
                rows={3}
              />
            </div>
            {canEdit ? (
              <div>
                <Button type="submit" disabled={pending}>
                  Save details
                </Button>
              </div>
            ) : null}
            {isSystem ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                System role — some operations are restricted.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Permission matrix</CardTitle>
          {canAssign && !locked ? (
            <Button size="sm" disabled={pending} onClick={savePermissions}>
              Save permissions
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-8">
          {locked ? (
            <p className="text-sm text-muted-foreground">
              Super Administrator permissions are implicit and cannot be edited.
            </p>
          ) : (
            Object.entries(matrix).map(([module, resources]) => (
              <div key={module} className="space-y-3">
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {module}
                </h3>
                {Object.entries(resources).map(([resource, actions]) => (
                  <div key={resource} className="rounded-md border p-3">
                    <p className="mb-2 text-sm font-medium capitalize">{resource}</p>
                    <div className="flex flex-wrap gap-3">
                      {actions.map((p) => (
                        <label
                          key={p.id}
                          className="inline-flex items-center gap-2 text-sm capitalize"
                        >
                          <Checkbox
                            checked={selected.includes(p.id)}
                            onCheckedChange={() => toggle(p.id)}
                            disabled={!canAssign}
                          />
                          {p.action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
