import type { StatusBadgeStatus } from "@/components/ui/status-badge";

const STATUS_MAP: Record<string, StatusBadgeStatus> = {
  active: "active",
  inactive: "inactive",
  pending: "pending",
  draft: "draft",
  approved: "approved",
  rejected: "rejected",
  completed: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  in_progress: "in_progress",
  open: "open",
  closed: "closed",
  maintenance: "maintenance",
  critical: "critical",
  planned: "pending",
  scheduled: "pending",
  operational: "active",
  reported: "pending",
  submitted: "pending",
  issued: "approved",
  received: "completed",
  passed: "approved",
  failed: "rejected",
  conditional: "pending",
  assigned: "in_progress",
  converted: "completed",
  paid: "completed",
  unread: "pending",
  read: "closed",
  changes_requested: "pending",
  down: "critical",
  idle: "inactive",
  low: "pending",
};

export function mapStatus(status: string | null | undefined): StatusBadgeStatus {
  if (!status) return "inactive";
  return STATUS_MAP[status.toLowerCase()] ?? "inactive";
}
