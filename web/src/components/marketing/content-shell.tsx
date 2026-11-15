import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass } from "@/lib/button";
import { GUIDES, TOOLS } from "@/lib/seo-pages";
import { absolute } from "@/lib/site";

export type Crumb = { name: string; href: string };

/** Structured data for search engines. `<` is escaped so no string can close the script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absolute(c.href) })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Public content pages (calculators, guides): header, breadcrumb, sign-up band and a footer that links everything. */
export function ContentShell({ crumbs, children, wide = false }: { crumbs: Crumb[]; children: React.ReactNode; wide?: boolean }) {
  const width = wide ? "max-w-6xl" : "max-w-3xl";
  return (
    <div className="min-h-dvh flex-1">
      <JsonLd data={breadcrumbLd(crumbs)} />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1">
            <Link href="/tools" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-fg sm:block">Calculators</Link>
            <Link href="/guides" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-fg sm:block">Guides</Link>
            <ThemeToggle />
            <Link href="/register" className={buttonClass("primary", "sm")}>Get started</Link>
          </nav>
        </div>
      </header>

      <div className={`mx-auto ${width} px-4 pt-6 sm:px-6`}>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-subtle" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i < crumbs.length - 1 ? <Link href={c.href} className="hover:text-fg">{c.name}</Link> : <span className="text-muted">{c.name}</span>}
            </li>
          ))}
        </ol>
      </div>

      <main className={`mx-auto ${width} px-4 pb-20 pt-6 sm:px-6`}>{children}</main>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Do this automatically, every month.</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              ArthOS saves first the moment income arrives, gives you one safe-to-spend number for today and tracks your investments at live prices. Free on
              web and Android.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/register" className={buttonClass("primary", "md")}>Create free account</Link>
            <Link href="/" className={buttonClass("secondary", "md")}>See how it works</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-muted">The personal financial operating system. Take control of your अर्थ.</p>
          </div>
          <div>
            <p className="mb-3 text-xs text-subtle">Free calculators</p>
            <ul className="space-y-1.5">
              {TOOLS.map((t) => (
                <li key={t.slug}><Link href={`/tools/${t.slug}`} className="text-muted hover:text-fg">{t.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs text-subtle">Guides</p>
            <ul className="space-y-1.5">
              {GUIDES.map((g) => (
                <li key={g.slug}><Link href={`/guides/${g.slug}`} className="text-muted hover:text-fg">{g.title.split(":")[0]}</Link></li>
              ))}
            </ul>
            <p className="mt-6 space-x-4 text-xs text-subtle">
              <Link href="/privacy" className="hover:text-fg">Privacy</Link>
              <Link href="/login" className="hover:text-fg">Sign in</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Prose styling for guides and the explanations under each calculator. */
export const PROSE =
  "space-y-5 text-[15.5px] leading-[1.75] text-fg-2 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:text-fg [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-fg [&_strong]:text-fg [&_strong]:font-semibold [&_ul]:space-y-2 [&_ol]:space-y-2 [&_ul>li]:ml-5 [&_ul>li]:list-disc [&_ul>li]:pl-1 [&_ol>li]:ml-5 [&_ol>li]:list-decimal [&_ol>li]:pl-1 [&_a]:text-fg [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-4 hover:[&_a]:decoration-fg [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-line-strong [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-fg [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_td]:pr-3 [&_td]:tabular";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="mt-14">
      <JsonLd data={faqLd(items)} />
      <h2 className="font-display text-[1.75rem] tracking-tight">Frequently asked questions</h2>
      <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg">
              {f.q}
              <span className="text-subtle transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
