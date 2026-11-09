import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Shared shell for the public policy pages (privacy, account deletion). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex-1">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-subtle">Last updated {updated}</p>
        <div className="legal mt-10 space-y-8 text-[15px] leading-relaxed text-fg-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-fg [&_ul]:mt-3 [&_ul]:space-y-1.5">
          {children}
        </div>
        <p className="mt-16 text-sm text-subtle">
          <Link href="/" className="hover:text-fg">← ArthOS home</Link>
        </p>
      </main>
    </div>
  );
}
