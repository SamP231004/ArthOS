import Link from "next/link";
import { Logo } from "../logo";
import { buttonClass } from "@/lib/button";
import { ThemeToggle } from "../theme-toggle";

const links = [
  ["Features", "#features"],
  ["Android app", "#app"],
  ["Web vs app", "#platforms"],
  ["Privacy", "#privacy"],
  ["FAQ", "#faq"],
];

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-line bg-bg/70 py-2.5 pl-4 pr-2.5 shadow-[0_10px_40px_-10px_rgb(0_0_0/0.6)] backdrop-blur-xl">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {links.map(([l, h]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-fg">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className={buttonClass("ghost", "sm")}>
            Sign in
          </Link>
          <Link href="/register" className={buttonClass("primary", "sm")}>
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
