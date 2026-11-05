"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Gauge, LayoutDashboard, LogOut, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass } from "@/lib/button";
import { useAuth } from "@/lib/auth-store";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/income", label: "Income", icon: ArrowDownLeft },
  { href: "/dashboard/expenses", label: "Expenses", icon: ArrowUpRight },
  { href: "/dashboard/budget", label: "Budget", icon: Gauge },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const soon = ["Investments", "Insights", "Widgets"];

function initials(name?: string) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function DemoBanner() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [now] = useState(() => Date.now());
  if (!user?.demo) return null;
  const hours = user.expiresAt ? Math.max(1, Math.round((new Date(user.expiresAt).getTime() - now) / 3_600_000)) : 24;

  // Keep the demo session until they register: signing out first made the dashboard's guard race us to /login.
  // The register form replaces the session on success.
  function convert() {
    router.push("/register");
  }

  return (
    <div className="relative overflow-hidden border-b border-brand/20 bg-gradient-to-r from-brand/[0.12] via-brand/[0.06] to-transparent">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
        <p className="flex items-center gap-2 text-sm text-fg-2">
          <Sparkles size={15} className="shrink-0 text-brand" />
          <span>
            You&apos;re exploring a <span className="font-medium text-fg">private demo</span> with sample data. Edit anything — it resets in ~{hours}h.
          </span>
        </p>
        <button onClick={convert} className={buttonClass("primary", "sm")}>
          Create your free account
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  // Full navigation after sign-out: avoids racing the auth guard's redirect and discards any page state
  // Next.js keeps alive between routes (e.g. a half-finished demo start).
  function logout() {
    const dest = user?.demo ? "/" : "/login";
    signOut();
    qc.clear();
    window.location.replace(dest);
  }

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-bg-2/80 px-3 py-5 backdrop-blur md:flex">
        <div className="flex items-center justify-between pl-3">
          <Logo href="/dashboard" />
          <ThemeToggle />
        </div>

        <p className="mt-9 px-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-subtle">Money</p>
        <nav className="mt-2 space-y-0.5">
          {nav.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active ? "bg-fg/[0.06] text-fg shadow-[inset_0_1px_0_rgb(var(--hl)/0.05)]" : "text-muted hover:bg-fg/[0.03] hover:text-fg"
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />}
                <n.icon size={17} className={active ? "text-brand" : "text-subtle group-hover:text-fg-2"} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <p className="mt-8 px-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-subtle">Coming soon</p>
        <div className="mt-2 space-y-0.5">
          {soon.map((s) => (
            <div key={s} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-subtle">
              {s}
              <span className="rounded-full border border-line px-1.5 py-px text-[9.5px] uppercase tracking-wider">Soon</span>
            </div>
          ))}
        </div>

        <div className="panel mt-auto flex items-center gap-3 p-3">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar; next/image would need remotePatterns
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-line-strong" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-1 to-accent-3 text-xs font-semibold text-accent-fg">
              {initials(user?.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-[11px] text-subtle">{user?.demo ? "Demo account" : user?.email}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-1.5 text-subtle transition hover:bg-fg/5 hover:text-expense" aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <DemoBanner />
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
          <button onClick={logout} className="rounded-lg p-2 text-muted" aria-label="Sign out">
            <LogOut size={18} />
          </button>
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 glow-soft" />
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-line bg-surface/90 p-1 shadow-2xl backdrop-blur-xl md:hidden">
        {nav.map((n) => {
          const active = isActive(n.href);
          return (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] ${active ? "bg-fg/[0.06] text-brand" : "text-subtle"}`}>
              <n.icon size={18} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
