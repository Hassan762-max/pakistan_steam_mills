"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import {
  createInspectionAction,
  createNcrAction,
  updateInspectionAction,
} from "@/server/actions/quality";

export type InspectionRow = {
  id: string;
  inspectionNumber: string;
  type: string;
  productName: string | null;
  batchNumber: string | null;
  status: string;
  inspectorName: string | null;
  ncrCount: number;
  createdAt: string;
};

export type NcrRow = {
  id: string;
  ncrNumber: string;
  title: string;
  severity: string;
  status: string;
  inspectionNumber: string | null;
};

type Props = {
  inspections: InspectionRow[];
  ncrs: NcrRow[];
  canCreateInspection: boolean;
  canApproveInspection: boolean;
  canCreateNcr: boolean;
};

export function QualityClient({
  inspections,
  ncrs,
  canCreateInspection,
  canApproveInspection,
  canCreateNcr,
}: Props) {
  const router = useRouter();
  const [inspOpen, setInspOpen] = React.useState(false);
  const [ncrOpen, setNcrOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [inspForm, setInspForm] = React.useState({
    inspectionNumber: "",
    type: "incoming",
    productName: "",
    batchNumber: "",
    inspectorName: "",
  });
  const [ncrForm, setNcrForm] = React.useState({
    ncrNumber: "",
    title: "",
    severity: "minor",
    inspectionId: "",
  });

  async function createInsp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createInspectionAction({
      ...inspForm,
      productName: inspForm.productName || undefined,
      batchNumber: inspForm.batchNumber || undefined,
      inspectorName: inspForm.inspectorName || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Inspection created");
    setInspOpen(false);
    router.refresh();
  }

  async function createNcr(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createNcrAction({
      ncrNumber: ncrForm.ncrNumber,
      title: ncrForm.title,
      severity: ncrForm.severity,
      inspectionId: ncrForm.inspectionId || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("NCR created");
    setNcrOpen(false);
    router.refresh();
  }

  async function decide(id: string, status: "passed" | "failed") {
    setPending(true);
    const result = await updateInspectionAction(id, { status });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success(`Marked ${status}`);
    router.refresh();
  }

  const inspColumns = React.useMemo<DataTableColumnDef<InspectionRow>[]>(
    () => [
      { accessorKey: "inspectionNumber", header: "Inspection #" },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => row.original.productName ?? "—",
      },
      {
        accessorKey: "batchNumber",
        header: "Batch",
        cell: ({ row }) => row.original.batchNumber ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      { accessorKey: "ncrCount", header: "NCRs" },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          canApproveInspection && row.original.status === "pending" ? (
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                onClick={() => decide(row.original.id, "passed")}
                aria-label="Pass"
              >
                <Check className="size-4 text-success" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                onClick={() => decide(row.original.id, "failed")}
                aria-label="Fail"
              >
                <X className="size-4 text-destructive" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [canApproveInspection, pending],
  );

  const ncrColumns = React.useMemo<DataTableColumnDef<NcrRow>[]>(
    () => [
      { accessorKey: "ncrNumber", header: "NCR #" },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "severity", header: "Severity" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "inspectionNumber",
        header: "Inspection",
        cell: ({ row }) => row.original.inspectionNumber ?? "—",
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue="inspections" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="ncrs">NCRs</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          {canCreateInspection ? (
            <Dialog open={inspOpen} onOpenChange={setInspOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="accent" size="sm">
                  <Plus className="size-4" />
                  Inspection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New inspection</DialogTitle>
                  <DialogDescription>Log a quality check for a batch or product.</DialogDescription>
                </DialogHeader>
                <form onSubmit={createInsp} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Number</Label>
                      <Input
                        value={inspForm.inspectionNumber}
                        onChange={(e) =>
                          setInspForm((f) => ({ ...f, inspectionNumber: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select
                        value={inspForm.type}
                        onValueChange={(v) => setInspForm((f) => ({ ...f, type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incoming">Incoming</SelectItem>
                          <SelectItem value="in_process">In process</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Product</Label>
                      <Input
                        value={inspForm.productName}
                        onChange={(e) =>
                          setInspForm((f) => ({ ...f, productName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Batch</Label>
                      <Input
                        value={inspForm.batchNumber}
                        onChange={(e) =>
                          setInspForm((f) => ({ ...f, batchNumber: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="accent" disabled={pending}>
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
          {canCreateNcr ? (
            <Dialog open={ncrOpen} onOpenChange={setNcrOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="size-4" />
                  NCR
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New NCR</DialogTitle>
                  <DialogDescription>Raise a non-conformance report.</DialogDescription>
                </DialogHeader>
                <form onSubmit={createNcr} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>NCR number</Label>
                    <Input
                      value={ncrForm.ncrNumber}
                      onChange={(e) => setNcrForm((f) => ({ ...f, ncrNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input
                      value={ncrForm.title}
                      onChange={(e) => setNcrForm((f) => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select
                      value={ncrForm.severity}
                      onValueChange={(v) => setNcrForm((f) => ({ ...f, severity: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Linked inspection</Label>
                    <Select
                      value={ncrForm.inspectionId || "__none__"}
                      onValueChange={(v) =>
                        setNcrForm((f) => ({
                          ...f,
                          inspectionId: v === "__none__" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {inspections.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.inspectionNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={pending}>
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>
      <TabsContent value="inspections">
        <DataTable
          columns={inspColumns}
          data={inspections}
          searchPlaceholder="Search inspections…"
          emptyTitle="No inspections"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="ncrs">
        <DataTable
          columns={ncrColumns}
          data={ncrs}
          searchPlaceholder="Search NCRs…"
          emptyTitle="No NCRs"
          getRowId={(r) => r.id}
        />
      </TabsContent>
    </Tabs>
  );
}
