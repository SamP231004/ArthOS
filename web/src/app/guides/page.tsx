import type { Metadata } from "next";
import Link from "next/link";
import { ContentShell, JsonLd } from "@/components/marketing/content-shell";
import { GUIDES, TOOLS } from "@/lib/seo-pages";
import { absolute } from "@/lib/site";

const title = "Personal finance guides for India";
const description = "Clear, practical guides on budgeting your salary, the 50/30/20 rule, saving first, tracking UPI spending, XIRR and emergency funds.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: { url: "/guides", title, description },
};

export default function GuidesIndex() {
  return (
    <ContentShell wide crumbs={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: absolute(`/guides/${g.slug}`), name: g.title })),
        }}
      />
      <p className="eyebrow">Plain words · Indian examples · no jargon</p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">{description}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="panel group flex flex-col p-6 transition hover:border-line-strong">
            <p className="text-xs text-subtle">{g.minutes} min read</p>
            <h2 className="mt-2 font-display text-2xl leading-snug tracking-tight">{g.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{g.blurb}</p>
          </Link>
        ))}
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl tracking-tight">Prefer numbers? Try a calculator</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <Link key={t.slug} href={`/tools/${t.slug}`} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-fg-2 transition hover:border-line-strong hover:text-fg">
              {t.name}
            </Link>
          ))}
        </div>
      </div>
    </ContentShell>
  );
}
