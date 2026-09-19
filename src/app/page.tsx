import Link from "next/link";
import {
  Factory,
  ArrowRight,
  ShieldCheck,
  Gauge,
  Warehouse,
  Users,
  Wrench,
} from "lucide-react";
import { getSessionUser } from "@/server/auth/service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pakistan Steel Mills Management System",
  description:
    "Enterprise operations platform for Pakistan Steel Mills — production, inventory, HR, procurement, and industrial control.",
};

const CAPABILITIES = [
  {
    icon: Gauge,
    title: "Production",
    text: "Orders, lines, targets, and efficiency across mill operations.",
  },
  {
    icon: Warehouse,
    title: "Inventory",
    text: "Stock levels, warehouses, movements, and reorder alerts.",
  },
  {
    icon: Users,
    title: "Workforce",
    text: "Employees, attendance, leave, and organizational structure.",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    text: "Equipment registry, work orders, and downtime tracking.",
  },
] as const;

export default async function HomePage() {
  const user = await getSessionUser();
  const signedIn = Boolean(user && user.status !== "pending");

  return (
    <div className="min-h-screen bg-[hsl(210_55%_8%)] text-white">
      {/* ── Hero: one composition ── */}
      <header className="relative isolate min-h-[100svh] overflow-hidden">
        {/* Full-bleed industrial plane */}
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[hsl(210_55%_9%)]" />
          <div
            className="absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage: `
                linear-gradient(135deg, transparent 48%, hsl(210 20% 70% / 0.4) 49%, hsl(210 20% 70% / 0.4) 51%, transparent 52%),
                linear-gradient(45deg, transparent 48%, hsl(210 20% 70% / 0.28) 49%, hsl(210 20% 70% / 0.28) 51%, transparent 52%),
                linear-gradient(hsl(210 40% 40% / 0.18) 1px, transparent 1px),
                linear-gradient(90deg, hsl(210 40% 40% / 0.18) 1px, transparent 1px)
              `,
              backgroundSize: "56px 56px, 56px 56px, 28px 28px, 28px 28px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210_55%_14%/0.9)] via-transparent to-[hsl(210_55%_6%)]" />
          <div className="home-glow-metal absolute -bottom-32 left-[-10%] size-[42rem] rounded-full bg-[hsl(32_90%_48%/0.28)] blur-3xl" />
          <div className="home-glow-steel absolute -right-24 top-[-10%] size-[36rem] rounded-full bg-[hsl(210_80%_40%/0.22)] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[hsl(210_55%_8%)] to-transparent" />
        </div>

        <nav className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border border-white/15 bg-white/10">
              <Factory className="size-5 text-[hsl(32_90%_55%)]" aria-hidden />
            </div>
            <div className="leading-tight">
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-white/50 sm:text-xs">
                Government of Pakistan
              </p>
              <p className="font-heading text-sm font-semibold tracking-wide">Pakistan Steel Mills</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {signedIn ? (
              <Button asChild variant="accent" size="sm">
                <Link href="/dashboard">
                  Open console
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="accent" size="sm">
                  <Link href="/signup">Create account</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5.5rem)] max-w-6xl flex-col justify-center px-5 pb-20 pt-10 sm:px-8 lg:px-12">
          <p className="home-fade-up font-heading text-xs font-medium uppercase tracking-[0.28em] text-[hsl(32_90%_58%)]">
            Enterprise operations platform
          </p>
          <h1 className="home-fade-up home-delay-1 mt-5 max-w-4xl font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            Pakistan Steel Mills
            <span className="mt-2 block text-[hsl(32_90%_58%)]">Management System</span>
          </h1>
          <p className="home-fade-up home-delay-2 mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            One secure platform for production, inventory, workforce, procurement, and plant
            reliability — built for industrial scale.
          </p>
          <div className="home-fade-up home-delay-3 mt-10 flex flex-wrap items-center gap-3">
            {signedIn ? (
              <Button asChild variant="accent" size="lg">
                <Link href="/dashboard">
                  Continue to dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="accent" size="lg">
                  <Link href="/login">
                    Sign in to operations
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/signup">Request access</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Capabilities: one job ── */}
      <section className="relative border-t border-white/10 px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for mill operations
            </h2>
            <p className="mt-3 text-white/65">
              Modules that mirror how Pakistan Steel Mills runs — from the furnace floor to
              administration.
            </p>
          </div>
          <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item) => (
              <li key={item.title} className="border-t border-white/15 pt-5">
                <item.icon className="size-5 text-[hsl(32_90%_55%)]" aria-hidden />
                <h3 className="mt-4 font-heading text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Trust strip: one job ── */}
      <section className="relative border-t border-white/10 px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Secure by design
            </h2>
            <p className="mt-3 text-white/65">
              Permission-based access, session controls, and audit trails keep every operational
              action accountable.
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/70">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[hsl(32_90%_55%)]" aria-hidden />
            <p>
              Roles and permissions are enforced on the server — navigation only shows what you are
              authorized to use.
            </p>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section
        className={cn(
          "relative overflow-hidden border-t border-white/10 px-5 py-20 sm:px-8 lg:px-12",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[hsl(32_90%_48%/0.12)] via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to enter the mill console?
            </h2>
            <p className="mt-2 text-white/65">
              Sign in with your authorized Pakistan Steel Mills account.
            </p>
          </div>
          <Button asChild variant="accent" size="lg">
            <Link href={signedIn ? "/dashboard" : "/login"}>
              {signedIn ? "Go to dashboard" : "Sign in"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Pakistan Steel Mills</p>
          <p className="font-heading tracking-wide">Management System · Karachi Works</p>
        </div>
      </footer>
    </div>
  );
}
