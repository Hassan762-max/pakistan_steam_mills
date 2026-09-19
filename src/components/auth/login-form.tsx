"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeNextPath(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [emailOrUsername, setEmailOrUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await loginAction({ emailOrUsername, password });
      if (!result.ok) {
        toast.error(result.error ?? "Sign in failed");
        if (result.error?.toLowerCase().includes("locked")) {
          router.push("/account-locked");
        } else if (result.error?.toLowerCase().includes("verify")) {
          router.push("/verify-account");
        }
        return;
      }
      toast.success("Welcome back");
      if (result.data?.awaitingRoleAssignment || result.data?.status === "pending_approval") {
        router.push("/pending-approval");
      } else if (result.data?.mustChangePassword) {
        router.push("/profile");
      } else {
        router.push(safeNextPath(nextPath));
      }
      router.refresh();
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      description="Access the Pakistan Steel Mills Management System."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="emailOrUsername">Email or username</Label>
          <Input
            id="emailOrUsername"
            name="emailOrUsername"
            type="text"
            autoComplete="username"
            inputMode="email"
            required
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="admin@psm.gov.pk"
            aria-required="true"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-required="true"
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <aside
          className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground"
          aria-label="Demo credentials"
        >
          <p className="font-medium text-foreground/80">Demo credentials</p>
          <p className="mt-1 font-mono">
            admin@psm.gov.pk
            <span className="mx-1.5 text-muted-foreground/60">/</span>
            Password@123
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-xs"
            disabled={pending}
            onClick={() => {
              setEmailOrUsername("admin@psm.gov.pk");
              setPassword("Password@123");
            }}
          >
            Fill demo credentials
          </Button>
        </aside>
      </form>
    </AuthCard>
  );
}
