import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell, Faq, JsonLd, PROSE } from "@/components/marketing/content-shell";
import { GUIDE_CONTENT } from "@/content/guides";
import { GUIDES, guideBySlug, toolBySlug } from "@/lib/seo-pages";
import { AUTHOR, SITE_NAME, absolute } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  const path = `/guides/${g.slug}`;
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: path },
    authors: [AUTHOR],
    openGraph: { type: "article", url: path, title: g.title, description: g.description, publishedTime: g.published, modifiedTime: g.updated, authors: [AUTHOR.name] },
    twitter: { title: g.title, description: g.description },
  };
}

const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  const content = GUIDE_CONTENT[slug];
  if (!g || !content) notFound();
  const { Body, faq } = content;
  const tool = g.tool ? toolBySlug(g.tool) : undefined;
  const more = GUIDES.filter((x) => x.slug !== slug).slice(0, 3);

  return (
    <ContentShell crumbs={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: g.title.split(":")[0], href: `/guides/${slug}` }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          datePublished: g.published,
          dateModified: g.updated,
          author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
          publisher: { "@type": "Organization", name: SITE_NAME, url: absolute("/"), logo: { "@type": "ImageObject", url: absolute("/icon.svg") } },
          mainEntityOfPage: absolute(`/guides/${slug}`),
          inLanguage: "en-IN",
        }}
      />
      <article>
        <header>
          <p className="eyebrow">Guide · {g.minutes} min read</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl">{g.title}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">{g.description}</p>
          <p className="mt-5 text-xs text-subtle">
            By {AUTHOR.name} · Updated <time dateTime={g.updated}>{fmt(g.updated)}</time>
          </p>
        </header>

        {tool && (
          <Link href={`/tools/${tool.slug}`} className="panel-glow mt-8 flex items-center justify-between gap-4 p-5">
            <span>
              <span className="block text-xs text-mark">Free calculator</span>
              <span className="mt-1 block font-display text-xl">{tool.name}</span>
            </span>
            <span className="text-sm text-fg-2">Try it →</span>
          </Link>
        )}

        <div className={`mt-10 ${PROSE}`}>
          <Body />
        </div>
        <Faq items={faq} />
        <p className="mt-10 text-xs leading-relaxed text-subtle">
          This guide is general information to help you plan, not personalised financial advice. Rates and returns mentioned are indicative and change over
          time.
        </p>
      </article>

      <section className="mt-16">
        <h2 className="font-display text-2xl tracking-tight">Keep reading</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {more.map((m) => (
            <Link key={m.slug} href={`/guides/${m.slug}`} className="panel block p-4 transition hover:border-line-strong">
              <p className="text-[15px] leading-snug text-fg">{m.title.split(":")[0]}</p>
              <p className="mt-2 text-xs text-subtle">{m.minutes} min read</p>
            </Link>
          ))}
        </div>
      </section>
    </ContentShell>
  );
}
