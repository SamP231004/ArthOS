import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentShell, JsonLd } from "@/components/marketing/content-shell";
import { TOOLS } from "@/lib/seo-pages";
import { absolute } from "@/lib/site";

const title = "Free money calculators for India";
const description = "Free budget, SIP, emergency fund and savings goal calculators in rupees. Instant results, no sign-up, and nothing you type leaves your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools" },
  openGraph: { url: "/tools", title, description },
};

export default function ToolsIndex() {
  return (
    <ContentShell wide crumbs={[{ name: "Home", href: "/" }, { name: "Calculators", href: "/tools" }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: absolute(`/tools/${t.slug}`), name: t.name })),
        }}
      />
      <p className="eyebrow">No sign-up · works in rupees · private</p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">{description}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.slug} href={`/tools/${t.slug}`} className="panel group flex flex-col p-6 transition hover:border-line-strong">
            <h2 className="font-display text-2xl tracking-tight">{t.name}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t.blurb}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-fg-2 group-hover:text-fg">
              Open calculator <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </ContentShell>
  );
}
