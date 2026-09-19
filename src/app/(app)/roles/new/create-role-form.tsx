"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createRoleAction } from "@/server/actions/roles";
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

export function CreateRoleForm({ permissions }: { permissions: Permission[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);

  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createRoleAction({
        code: String(fd.get("code")),
        name: String(fd.get("name")),
        description: String(fd.get("description") || "") || undefined,
        permissionIds: selected,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to create role");
        return;
      }
      toast.success("Role created");
      router.push(`/roles/${result.data?.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" required placeholder="e.g. plant_supervisor" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(byModule).map(([module, perms]) => (
            <div key={module}>
              <h3 className="mb-2 font-heading text-sm font-semibold capitalize">{module}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.includes(p.id)}
                      onCheckedChange={() =>
                        setSelected((prev) =>
                          prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                        )
                      }
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{p.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create role"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
