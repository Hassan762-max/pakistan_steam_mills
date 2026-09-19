import Link from "next/link";
import { Factory } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[hsl(var(--steel-navy))] px-6 text-center text-[hsl(210_40%_98%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(32 90% 48% / 0.35), transparent), linear-gradient(180deg, transparent, hsl(210 55% 8%))",
        }}
      />
      <div className="relative z-10 max-w-lg space-y-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-[hsl(32_90%_48%/0.2)] text-[hsl(32_90%_55%)]">
          <Factory className="size-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[hsl(32_90%_55%)]">
            Pakistan Steel Mills
          </p>
          <h1 className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl">404</h1>
          <p className="text-base text-[hsl(210_20%_75%)]">
            This page is not on the mill map. Check the URL or return to a known area of the
            management system.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="accent">
            <Link href="/login">Go to sign in</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
