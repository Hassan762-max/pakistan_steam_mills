import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { Factory } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <AuthBrandPanel />

      <div className="relative flex flex-col bg-background">
        {/* Mobile brand strip */}
        <div className="flex items-center gap-2.5 border-b border-border bg-[hsl(210_55%_12%)] px-5 py-3.5 text-white lg:hidden dark:bg-[hsl(210_45%_8%)]">
          <div className="flex size-8 items-center justify-center rounded-md border border-white/15 bg-white/10">
            <Factory className="size-3.5 text-[hsl(32_90%_55%)]" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold leading-tight">Pakistan Steel Mills</p>
            <p className="text-[11px] text-white/55">Management System</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
          {/* Soft industrial backdrop on form side */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
            aria-hidden
            style={{
              backgroundImage: `
                linear-gradient(hsl(210 55% 12%) 1px, transparent 1px),
                linear-gradient(90deg, hsl(210 55% 12%) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
