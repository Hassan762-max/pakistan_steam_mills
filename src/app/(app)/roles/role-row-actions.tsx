"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Copy, Power } from "lucide-react";
import { duplicateRoleAction, setRoleActiveAction } from "@/server/actions/roles";
import { Button } from "@/components/ui/button";

export function RoleRowActions({
  roleId,
  isActive,
  canEdit,
  canCreate,
}: {
  roleId: string;
  isActive: boolean;
  canEdit: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-1">
      {canEdit ? (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          title={isActive ? "Deactivate" : "Activate"}
          onClick={() => {
            startTransition(async () => {
              const result = await setRoleActiveAction(roleId, !isActive);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success(isActive ? "Role deactivated" : "Role activated");
                router.refresh();
              }
            });
          }}
        >
          <Power className="size-4" />
        </Button>
      ) : null}
      {canCreate ? (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          title="Duplicate"
          onClick={() => {
            startTransition(async () => {
              const result = await duplicateRoleAction(roleId);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Role duplicated");
                router.push(`/roles/${result.data?.id}`);
              }
            });
          }}
        >
          <Copy className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
