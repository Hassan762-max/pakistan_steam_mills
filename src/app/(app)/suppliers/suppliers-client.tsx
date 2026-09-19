"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { DataTableColumnDef } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { EntityStatus } from "@/components/ops/entity-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/utils";
import { createSupplierAction } from "@/server/actions/suppliers";

export type SupplierRow = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  city: string | null;
  status: string;
  rating: number | null;
  poCount: number;
  contractCount: number;
};

type Props = {
  suppliers: SupplierRow[];
  canCreate: boolean;
};

export function SuppliersClient({ suppliers, canCreate }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({ code: "", name: "", category: "", city: "", email: "" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createSupplierAction({
      code: form.code,
      name: form.name,
      category: form.category || undefined,
      city: form.city || undefined,
      email: form.email || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed to create supplier");
      return;
    }
    toast.success("Supplier created");
    setOpen(false);
    setForm({ code: "", name: "", category: "", city: "", email: "" });
    router.refresh();
  }

  const columns = React.useMemo<DataTableColumnDef<SupplierRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <Link
            href={`/suppliers/${row.original.id}`}
            className="font-medium text-accent hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => row.original.category ?? "—",
      },
      { accessorKey: "city", header: "City", cell: ({ row }) => row.original.city ?? "—" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) =>
          row.original.rating != null ? formatNumber(row.original.rating, 1) : "—",
      },
      { accessorKey: "poCount", header: "POs" },
      { accessorKey: "contractCount", header: "Contracts" },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="accent" size="sm">
                <Plus className="size-4" />
                Add supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New supplier</DialogTitle>
                <DialogDescription>Register a vendor for procurement workflows.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" disabled={pending}>
                    {pending ? "Saving…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={suppliers}
        searchPlaceholder="Search suppliers…"
        emptyTitle="No suppliers"
        getRowId={(r) => r.id}
      />
    </div>
  );
}
