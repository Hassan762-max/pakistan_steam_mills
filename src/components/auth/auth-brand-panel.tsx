import { Factory } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthBrandPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative hidden min-h-full flex-col justify-between overflow-hidden bg-[hsl(210_55%_12%)] px-10 py-12 text-white lg:flex xl:px-14",
        "dark:bg-[hsl(210_45%_8%)]",
        className,
      )}
      aria-label="Pakistan Steel Mills branding"
    >
      {/* Geometric steel lattice */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(135deg, transparent 48%, hsl(210 20% 70% / 0.35) 49%, hsl(210 20% 70% / 0.35) 51%, transparent 52%),
            linear-gradient(45deg, transparent 48%, hsl(210 20% 70% / 0.25) 49%, hsl(210 20% 70% / 0.25) 51%, transparent 52%),
            linear-gradient(hsl(210 40% 40% / 0.15) 1px, transparent 1px),
            linear-gradient(90deg, hsl(210 40% 40% / 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px, 48px 48px, 24px 24px, 24px 24px",
        }}
      />
      {/* Hot-metal accent glow */}
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-[hsl(32_90%_48%)]/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-24 size-64 rounded-full bg-[hsl(210_80%_45%)]/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md border border-white/15 bg-white/10 backdrop-blur-sm">
            <Factory className="size-5 text-[hsl(32_90%_55%)]" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-xs font-medium uppercase tracking-[0.18em] text-white/55">
              Government of Pakistan
            </p>
            <p className="font-heading text-sm font-semibold tracking-wide text-white">
              Pakistan Steel Mills
            </p>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Pakistan Steel Mills
            <span className="mt-1 block text-[hsl(32_90%_58%)]">Management System</span>
          </h1>
          <p className="text-base leading-relaxed text-white/70">
            Secure access to enterprise operations — production, inventory, maintenance, HR, and
            procurement in one industrial platform.
          </p>
        </div>
      </div>

      <div className="relative z-10 space-y-4 border-t border-white/10 pt-8">
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[hsl(32_90%_55%)]" aria-hidden />
            Role-based access across mill operations
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[hsl(32_90%_55%)]" aria-hidden />
            Audit-ready activity and compliance trails
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[hsl(32_90%_55%)]" aria-hidden />
            Built for Karachi works &amp; enterprise scale
          </li>
        </ul>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Pakistan Steel Mills</p>
      </div>
    </aside>
  );
}
