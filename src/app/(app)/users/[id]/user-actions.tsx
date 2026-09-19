"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  assignRolesAction,
  forceLogoutAction,
  resetUserPasswordAction,
  setUserStatusAction,
  updateUserAction,
} from "@/server/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PasswordStrength } from "@/components/ui/password-strength";

type RoleOption = { id: string; name: string; code: string };

export function UserActions({
  userId,
  status,
  firstName,
  lastName,
  phone,
  canEdit,
  canAssign,
  roles,
  assignedRoleIds,
}: {
  userId: string;
  status: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  canEdit: boolean;
  canAssign: boolean;
  roles: RoleOption[];
  assignedRoleIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(assignedRoleIds);
  const awaitingRole = status === "pending_approval";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? "Action failed");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canAssign ? (
        <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant={awaitingRole ? "default" : "outline"}>
              {awaitingRole ? "Assign role to activate" : "Assign roles"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {awaitingRole ? "Assign role to activate access" : "Assign roles"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {awaitingRole
                ? "Select at least one role. The user will be activated and notified."
                : "Choose the roles this account should have."}
            </p>
            <div className="grid gap-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() =>
                      setSelectedRoles((prev) =>
                        prev.includes(role.id)
                          ? prev.filter((id) => id !== role.id)
                          : [...prev, role.id],
                      )
                    }
                  />
                  <span>
                    {role.name}
                    <span className="ml-1 text-xs text-muted-foreground">({role.code})</span>
                  </span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button
                disabled={pending || selectedRoles.length === 0}
                onClick={() => {
                  run(
                    () => assignRolesAction(userId, selectedRoles),
                    awaitingRole ? "Role assigned — user activated" : "Roles updated",
                  );
                  setRolesOpen(false);
                }}
              >
                {awaitingRole ? "Assign & activate" : "Save roles"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {canEdit ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(
                  () =>
                    updateUserAction(userId, {
                      firstName: String(fd.get("firstName")),
                      lastName: String(fd.get("lastName")),
                      phone: String(fd.get("phone") || "") || null,
                    }),
                  "User updated",
                );
                setEditOpen(false);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" defaultValue={firstName} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" defaultValue={lastName} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={phone ?? ""} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {canEdit && status === "active" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setUserStatusAction(userId, "inactive"), "User disabled")}
        >
          Disable
        </Button>
      ) : null}

      {canEdit && (status === "inactive" || status === "pending_approval") ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending || status === "pending_approval"}
          onClick={() => run(() => setUserStatusAction(userId, "active"), "User enabled")}
          title={
            status === "pending_approval" ? "Assign a role to activate this account" : undefined
          }
        >
          Enable
        </Button>
      ) : null}

      {canEdit ? (
        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Reset password
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => resetUserPasswordAction(userId, password),
                  "Password reset — user must change on next login",
                );
                setResetOpen(false);
                setPassword("");
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordStrength password={password} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Reset
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {canEdit ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => forceLogoutAction(userId), "All sessions revoked")}
        >
          Force logout
        </Button>
      ) : null}
    </div>
  );
}
