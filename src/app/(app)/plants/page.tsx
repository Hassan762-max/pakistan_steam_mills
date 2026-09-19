import { requirePageUser } from "@/lib/require-page-user";
import { listPlants } from "@/server/services/organization";
import { withPageAuth } from "@/lib/page-auth";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PlantsPage() {
  const user = await requirePageUser();
  const plants = await withPageAuth(() => listPlants(user));

  return (
    <div className="space-y-6">
      <PageHeader title="Plants" description="Production plants and facility capacity." />

      {plants.length === 0 ? (
        <EmptyState title="No plants" description="Plant records will appear once configured." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity (MT)</TableHead>
                <TableHead>Divisions</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Warehouses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plants.map((plant) => (
                <TableRow key={plant.id}>
                  <TableCell className="font-mono text-xs">{plant.code}</TableCell>
                  <TableCell className="font-medium">{plant.name}</TableCell>
                  <TableCell>
                    {[plant.location, plant.city].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>{formatNumber(plant.capacityTons)}</TableCell>
                  <TableCell>{plant._count.divisions}</TableCell>
                  <TableCell>{plant._count.productionLines}</TableCell>
                  <TableCell>{plant._count.warehouses}</TableCell>
                  <TableCell>
                    <StatusBadge status={plant.status === "active" ? "active" : "inactive"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
