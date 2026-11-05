"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth-guard";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-store";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "◎" },
  { href: "/dashboard/income", label: "Income", icon: "↓" },
  { href: "/dashboard/expenses", label: "Expenses", icon: "↑" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();

  function logout() {
    signOut();
    qc.clear();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/50 p-4 md:flex">
        <div className="px-2 py-2">
          <Logo href="/dashboard" />
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map((n) => {
            const active = n.href === "/dashboard" ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg"
                }`}
              >
                <span className="w-4 text-center text-brand">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-border p-3">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <button onClick={logout} className="mt-3 text-xs text-muted hover:text-expense">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Logo href="/dashboard" />
          <button onClick={logout} className="text-sm text-muted">
            Sign out
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        {nav.map((n) => {
          const active = n.href === "/dashboard" ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-xs ${active ? "text-brand" : "text-muted"}`}>
              <span className="text-base">{n.icon}</span>
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
