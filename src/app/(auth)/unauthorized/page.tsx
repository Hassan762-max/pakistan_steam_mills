import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Unauthorized",
};

export default function UnauthorizedPage() {
  return (
    <AuthCard
      title="Access denied"
      description="You do not have permission to view this resource."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning-foreground dark:text-warning">
          <ShieldAlert className="size-5" aria-hidden />
        </div>
        <p className="font-heading text-3xl font-semibold tracking-tight text-foreground">403</p>
        <p className="text-sm text-muted-foreground">
          Your role does not include access to this area of the Pakistan Steel Mills Management
          System. Request elevated permissions from your supervisor if you need them.
        </p>
      </div>
    </AuthCard>
  );
}
