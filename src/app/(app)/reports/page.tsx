import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Factory,
  HardHat,
  Package,
  ShoppingCart,
  Users,
  Wrench,
  BadgeCheck,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/require-page-user";
import { getAvailableReports } from "@/server/services/reports";

const ICONS: Record<string, LucideIcon> = {
  employee: Users,
  production: Factory,
  inventory: Package,
  procurement: ShoppingCart,
  maintenance: Wrench,
  quality: BadgeCheck,
  safety: HardHat,
  attendance: CalendarDays,
  audit: ClipboardList,
};

const DESCRIPTIONS: Record<string, string> = {
  employee: "Headcount by department and employment status",
  production: "Order throughput, targets, and efficiency",
  inventory: "SKU counts and low-stock exposure",
  procurement: "Request/PO pipeline and spend",
  maintenance: "Work order and equipment status mix",
  quality: "Inspection outcomes and NCR volume",
  safety: "Incidents by type and status",
  attendance: "Presence, lateness, and overtime",
  audit: "Audit activity by module and action",
};

export default async function ReportsPage() {
  const user = await requirePageUser();
  const available = await getAvailableReports(user);
  if (available.length === 0) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational analytics across mills, people, and compliance."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {available.map((report) => {
          const Icon = ICONS[report.key] ?? BarChart3;
          return (
            <Link key={report.key} href={`/reports/${report.key}`} className="group block">
              <Card className="h-full transition-colors group-hover:border-accent/40 group-hover:bg-muted/30">
                <CardHeader className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-accent/15 group-hover:text-accent">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="font-heading text-lg">{report.label}</CardTitle>
                  <CardDescription>
                    {DESCRIPTIONS[report.key] ?? "Open filtered report view"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
