import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Session expired",
};

export default function SessionExpiredPage() {
  return (
    <AuthCard
      title="Session expired"
      description="Your signed-in session has ended for security."
      footer={
        <Button asChild className="w-full">
          <Link href="/login">Sign in again</Link>
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Clock className="size-5" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">
          For your protection, inactive or expired sessions are signed out automatically. Sign in
          again to continue working in the management system.
        </p>
      </div>
    </AuthCard>
  );
}
