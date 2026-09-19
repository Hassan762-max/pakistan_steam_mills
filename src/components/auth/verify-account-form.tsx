"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { verifyEmailAction } from "@/server/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyAccountForm({ initialToken = "" }: { initialToken?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [token, setToken] = React.useState(initialToken);
  const [verified, setVerified] = React.useState(false);
  const autoRan = React.useRef(false);

  const verify = React.useCallback(
    async (value: string) => {
      if (!value.trim()) {
        toast.error("Verification token is required");
        return;
      }
      setPending(true);
      try {
        const result = await verifyEmailAction({ token: value.trim() });
        if (!result.ok) {
          toast.error(result.error ?? "Verification failed");
          return;
        }
        setVerified(true);
        toast.success("Email verified — waiting for administrator role assignment");
      } catch {
        toast.error("Unable to verify account. Please try again.");
      } finally {
        setPending(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (initialToken && !autoRan.current) {
      autoRan.current = true;
      void verify(initialToken);
    }
  }, [initialToken, verify]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await verify(token);
  }

  if (verified) {
    return (
      <AuthCard
        title="Email verified"
        description="Your account is confirmed. An administrator has been notified to assign your role. You can sign in now and wait for approval."
        footer={
          <Button className="w-full" onClick={() => router.push("/login")}>
            Continue to sign in
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center" role="status">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-6" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">
            Status: awaiting role assignment. You will see a pending screen until an admin grants access.
          </p>
        </div>
      </AuthCard>
    );
  }

  const isPendingSignup = Boolean(initialToken) && pending;

  return (
    <AuthCard
      title={isPendingSignup ? "Verifying account" : "Verify account"}
      description={
        isPendingSignup
          ? "Confirming your email with the provided token…"
          : "Paste your verification token, or wait if you arrived from registration."
      }
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {isPendingSignup ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center" role="status" aria-live="polite">
          <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
          <p className="text-sm text-muted-foreground">Please wait while we verify your account…</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {!initialToken ? (
            <div
              className="mb-2 flex gap-3 rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground"
              role="note"
            >
              <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <p>
                If you just signed up, check your email for a verification link. In demo mode the
                token may appear in the URL after registration.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="token">Verification token</Label>
            <Input
              id="token"
              name="token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token"
              aria-required="true"
              disabled={pending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending || !token.trim()} aria-busy={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Verifying…
              </>
            ) : (
              "Verify account"
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
