import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account locked",
};

export default function AccountLockedPage() {
  return (
    <AuthCard
      title="Account locked"
      description="This account has been temporarily locked for security."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/forgot-password">Reset password</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="size-5" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">
          Too many failed sign-in attempts or an administrator lock may have disabled access.
          Wait for the lockout period to end, reset your password, or contact IT support at{" "}
          <a
            href="mailto:support@psm.gov.pk"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            support@psm.gov.pk
          </a>
          .
        </p>
      </div>
    </AuthCard>
  );
}
