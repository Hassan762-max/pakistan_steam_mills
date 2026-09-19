"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signupAction } from "@/server/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/ui/password-strength";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await signupAction(form);
      if (!result.ok) {
        toast.error(result.error ?? "Sign up failed");
        return;
      }
      toast.success("Account created — verify your email. An admin will assign your role after verification.");
      const token = result.data?.verificationToken;
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      router.push(`/verify-account${qs}`);
    } catch {
      toast.error("Unable to create account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create account"
      description="Register for access. After email verification, an administrator must assign your role."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              aria-required="true"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              aria-required="true"
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="you@psm.gov.pk"
            aria-required="true"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            aria-required="true"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            aria-required="true"
            aria-describedby="password-strength"
            disabled={pending}
          />
          <PasswordStrength id="password-strength" password={form.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            aria-required="true"
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
