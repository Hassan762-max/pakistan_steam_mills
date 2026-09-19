"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/server/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/ui/password-strength";

export function ResetPasswordForm({ initialToken = "" }: { initialToken?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [token, setToken] = React.useState(initialToken);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await resetPasswordAction({ token, password, confirmPassword });
      if (!result.ok) {
        toast.error(result.error ?? "Reset failed");
        return;
      }
      toast.success("Password updated — you can sign in now");
      router.push("/login");
    } catch {
      toast.error("Unable to reset password. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Reset password"
      description="Choose a new strong password for your account."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {!initialToken ? (
          <div className="space-y-2">
            <Label htmlFor="token">Reset token</Label>
            <Input
              id="token"
              name="token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from your email"
              aria-required="true"
              disabled={pending}
            />
          </div>
        ) : (
          <input type="hidden" name="token" value={token} />
        )}

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-required="true"
            aria-describedby="reset-password-strength"
            disabled={pending}
          />
          <PasswordStrength id="reset-password-strength" password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-required="true"
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending || !token} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
