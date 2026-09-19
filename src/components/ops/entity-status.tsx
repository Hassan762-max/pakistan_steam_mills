import { StatusBadge } from "@/components/ui/status-badge";
import { mapStatus } from "@/lib/status-map";

export function EntityStatus({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <StatusBadge status={mapStatus(status)} label={status.replaceAll("_", " ")} />;
}
