import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell, Faq, JsonLd, PROSE } from "@/components/marketing/content-shell";
import { TOOL_CONTENT } from "@/content/tools";
import { TOOLS, guideBySlug, toolBySlug } from "@/lib/seo-pages";
import { absolute } from "@/lib/site";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const tool = toolBySlug((await params).slug);
  if (!tool) return {};
  const path = `/tools/${tool.slug}`;
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title: tool.title, description: tool.description },
    twitter: { title: tool.title, description: tool.description },
  };
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  const content = TOOL_CONTENT[slug];
  if (!tool || !content) notFound();
  const { Calculator, Body, faq, intro } = content;
  const guide = content.guide ? guideBySlug(content.guide) : undefined;
  const others = TOOLS.filter((t) => t.slug !== slug);

  return (
    <ContentShell wide crumbs={[{ name: "Home", href: "/" }, { name: "Calculators", href: "/tools" }, { name: tool.name, href: `/tools/${slug}` }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: tool.name,
          url: absolute(`/tools/${slug}`),
          description: tool.description,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any (web browser)",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        }}
      />
      <div className="max-w-3xl">
        <p className="eyebrow">Free calculator · runs in your browser</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">{tool.name}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">{intro}</p>
      </div>

      <div className="mt-10">
        <Calculator />
      </div>
      <p className="mt-3 text-xs text-subtle">Nothing you enter leaves this page. Results are estimates for planning, not financial advice.</p>

      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className={PROSE}>
          <Body />
          <Faq items={faq} />
        </article>

        <aside className="space-y-6 lg:pt-12">
          {guide && (
            <Link href={`/guides/${guide.slug}`} className="panel block p-5 transition hover:border-line-strong">
              <p className="text-xs text-subtle">Read the guide · {guide.minutes} min</p>
              <p className="mt-1.5 font-display text-xl leading-snug">{guide.title}</p>
            </Link>
          )}
          <div className="panel p-5">
            <p className="text-xs text-subtle">More free calculators</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {others.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/${t.slug}`} className="text-fg-2 hover:text-fg">{t.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </ContentShell>
  );
}
