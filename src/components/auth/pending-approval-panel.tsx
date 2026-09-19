import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

export function PendingApprovalPanel({
  firstName,
  lastName,
  email,
  status,
}: {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock3 className="size-6" aria-hidden />
          </div>
          <CardTitle className="font-heading text-xl">Awaiting role assignment</CardTitle>
          <CardDescription>
            Your email is verified. An administrator must assign a role before you can access mill
            operations modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted/40 px-3 py-3">
            <p className="font-medium">
              {firstName} {lastName}
            </p>
            <p className="text-muted-foreground">{email}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Status:{" "}
              <span className="capitalize text-foreground">{status.replaceAll("_", " ")}</span>
            </p>
          </div>

          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              Administrators have been notified to review your account.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              After a role is assigned, refresh this page or sign in again.
            </li>
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/pending-approval">Refresh status</Link>
            </Button>
            <form action={signOutAction} className="flex-1">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
