import { OG_SIZE, ogImage } from "@/lib/og";
import { TOOLS, toolBySlug } from "@/lib/seo-pages";

export const alt = "ArthOS free calculator";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolBySlug((await params).slug);
  return ogImage({ eyebrow: "Free calculator", title: tool?.name ?? "Free money calculators" });
}
