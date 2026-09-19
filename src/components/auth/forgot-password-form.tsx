"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [demoToken, setDemoToken] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await forgotPasswordAction({ email });
      if (!result.ok) {
        toast.error(result.error ?? "Request failed");
        return;
      }
      setSubmitted(true);
      setDemoToken(result.data?.token ?? null);
      toast.success("If an account exists, reset instructions were sent");
    } catch {
      toast.error("Unable to process request. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, password reset instructions have been sent."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        {demoToken ? (
          <div
            className="rounded-md border border-dashed border-accent/40 bg-accent/5 px-3 py-3 text-sm"
            role="status"
          >
            <p className="font-medium text-foreground">Demo reset link</p>
            <p className="mt-1 text-muted-foreground">
              Email delivery is not configured in this environment. Use the link below:
            </p>
            <Link
              href={`/reset-password?token=${encodeURIComponent(demoToken)}`}
              className="mt-2 inline-block break-all font-medium text-primary underline-offset-4 hover:underline"
            >
              Reset your password
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can close this page and follow the instructions in your inbox.
          </p>
        )}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your work email and we will send a secure reset link."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@psm.gov.pk"
            aria-required="true"
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
