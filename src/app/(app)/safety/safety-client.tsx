"use client";

import * as React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  createIncidentAction,
  createSafetyInspectionAction,
} from "@/server/actions/safety";

export type IncidentRow = {
  id: string;
  incidentNumber: string;
  type: string;
  title: string;
  severity: string;
  status: string;
  location: string | null;
  occurredAt: string;
  injuredCount: number;
};

export type SafetyInspectionRow = {
  id: string;
  inspectionNo: string;
  area: string;
  status: string;
  inspectorName: string | null;
  scheduledAt: string | null;
};

type Props = {
  incidents: IncidentRow[];
  inspections: SafetyInspectionRow[];
  canReport: boolean;
  canCreateInspection: boolean;
};

export function SafetyClient({
  incidents,
  inspections,
  canReport,
  canCreateInspection,
}: Props) {
  const router = useRouter();
  const [incOpen, setIncOpen] = React.useState(false);
  const [inspOpen, setInspOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [incForm, setIncForm] = React.useState({
    incidentNumber: "",
    type: "near_miss",
    title: "",
    description: "",
    severity: "low",
    location: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    injuredCount: "0",
  });
  const [inspForm, setInspForm] = React.useState({
    inspectionNo: "",
    area: "",
    inspectorName: "",
    scheduledAt: "",
  });

  async function submitIncident(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createIncidentAction({
      incidentNumber: incForm.incidentNumber,
      type: incForm.type,
      title: incForm.title,
      description: incForm.description || undefined,
      severity: incForm.severity,
      location: incForm.location || undefined,
      occurredAt: new Date(incForm.occurredAt).toISOString(),
      injuredCount: Number(incForm.injuredCount) || 0,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Incident reported");
    setIncOpen(false);
    router.refresh();
  }

  async function submitInspection(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createSafetyInspectionAction({
      inspectionNo: inspForm.inspectionNo,
      area: inspForm.area,
      inspectorName: inspForm.inspectorName || undefined,
      scheduledAt: inspForm.scheduledAt || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Safety inspection scheduled");
    setInspOpen(false);
    router.refresh();
  }

  const incidentColumns = React.useMemo<DataTableColumnDef<IncidentRow>[]>(
    () => [
      { accessorKey: "incidentNumber", header: "Incident #" },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "type", header: "Type" },
      { accessorKey: "severity", header: "Severity" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => row.original.location ?? "—",
      },
      {
        accessorKey: "occurredAt",
        header: "Occurred",
        cell: ({ row }) => formatDateTime(row.original.occurredAt),
      },
      { accessorKey: "injuredCount", header: "Injured" },
    ],
    [],
  );

  const inspColumns = React.useMemo<DataTableColumnDef<SafetyInspectionRow>[]>(
    () => [
      { accessorKey: "inspectionNo", header: "Inspection #" },
      { accessorKey: "area", header: "Area" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatus status={row.original.status} />,
      },
      {
        accessorKey: "inspectorName",
        header: "Inspector",
        cell: ({ row }) => row.original.inspectorName ?? "—",
      },
      {
        accessorKey: "scheduledAt",
        header: "Scheduled",
        cell: ({ row }) => formatDate(row.original.scheduledAt),
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue="incidents" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          {canReport ? (
            <Dialog open={incOpen} onOpenChange={setIncOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="accent" size="sm">
                  <Plus className="size-4" />
                  Report incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Report safety incident</DialogTitle>
                  <DialogDescription>
                    Capture near-misses and injuries for investigation.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={submitIncident} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Number</Label>
                      <Input
                        value={incForm.incidentNumber}
                        onChange={(e) =>
                          setIncForm((f) => ({ ...f, incidentNumber: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select
                        value={incForm.type}
                        onValueChange={(v) => setIncForm((f) => ({ ...f, type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="near_miss">Near miss</SelectItem>
                          <SelectItem value="injury">Injury</SelectItem>
                          <SelectItem value="property_damage">Property damage</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Title</Label>
                      <Input
                        value={incForm.title}
                        onChange={(e) => setIncForm((f) => ({ ...f, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Severity</Label>
                      <Select
                        value={incForm.severity}
                        onValueChange={(v) => setIncForm((f) => ({ ...f, severity: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Occurred at</Label>
                      <Input
                        type="datetime-local"
                        value={incForm.occurredAt}
                        onChange={(e) =>
                          setIncForm((f) => ({ ...f, occurredAt: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={incForm.description}
                        onChange={(e) =>
                          setIncForm((f) => ({ ...f, description: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="accent" disabled={pending}>
                      Submit
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
          {canCreateInspection ? (
            <Dialog open={inspOpen} onOpenChange={setInspOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="size-4" />
                  Inspection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule safety inspection</DialogTitle>
                </DialogHeader>
                <form onSubmit={submitInspection} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Inspection no.</Label>
                    <Input
                      value={inspForm.inspectionNo}
                      onChange={(e) =>
                        setInspForm((f) => ({ ...f, inspectionNo: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Area</Label>
                    <Input
                      value={inspForm.area}
                      onChange={(e) => setInspForm((f) => ({ ...f, area: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Inspector</Label>
                    <Input
                      value={inspForm.inspectorName}
                      onChange={(e) =>
                        setInspForm((f) => ({ ...f, inspectorName: e.target.value }))
                      }
                    />
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
      <TabsContent value="incidents">
        <DataTable
          columns={incidentColumns}
          data={incidents}
          searchPlaceholder="Search incidents…"
          emptyTitle="No incidents"
          getRowId={(r) => r.id}
        />
      </TabsContent>
      <TabsContent value="inspections">
        <DataTable
          columns={inspColumns}
          data={inspections}
          searchPlaceholder="Search inspections…"
          emptyTitle="No safety inspections"
          getRowId={(r) => r.id}
        />
      </TabsContent>
    </Tabs>
  );
}
