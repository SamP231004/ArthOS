import { OG_SIZE, ogImage } from "@/lib/og";
import { GUIDES, guideBySlug } from "@/lib/seo-pages";

export const alt = "ArthOS guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  return ogImage({ eyebrow: `Guide · ${g?.minutes ?? 5} min read`, title: g?.title ?? "Personal finance guides" });
}
