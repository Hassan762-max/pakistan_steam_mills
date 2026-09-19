"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createUserAction } from "@/server/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrength } from "@/components/ui/password-strength";

type RoleOption = { id: string; name: string; code: string };

export function CreateUserForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  function toggleRole(id: string) {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUserAction({
        email: String(fd.get("email")),
        username: String(fd.get("username")),
        password: String(fd.get("password")),
        firstName: String(fd.get("firstName")),
        lastName: String(fd.get("lastName")),
        phone: String(fd.get("phone") || "") || undefined,
        roleIds: selectedRoles,
        mustChangePassword: fd.get("mustChangePassword") === "on",
      });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to create user");
        return;
      }
      toast.success(
        selectedRoles.length
          ? "User created with roles"
          : "User created — assign a role so they can access the system",
      );
      router.push(`/users/${result.data?.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength password={password} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="mustChangePassword" name="mustChangePassword" defaultChecked />
            <Label htmlFor="mustChangePassword">Require password change on first login</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select at least one role for immediate access. If none are selected, the user stays
            awaiting role assignment and admins are notified.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <Checkbox
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={() => toggleRole(role.id)}
              />
              <span>
                {role.name}
                <span className="ml-1 text-xs text-muted-foreground">({role.code})</span>
              </span>
            </label>
          ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
