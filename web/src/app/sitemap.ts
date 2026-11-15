import type { MetadataRoute } from "next";
import { GUIDES, TOOLS } from "@/lib/seo-pages";
import { absolute } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absolute("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absolute("/tools"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...TOOLS.map((t) => ({ url: absolute(`/tools/${t.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: absolute("/guides"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...GUIDES.map((g) => ({ url: absolute(`/guides/${g.slug}`), lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: absolute("/register"), changeFrequency: "yearly", priority: 0.5 },
    { url: absolute("/login"), changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/delete-account"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
