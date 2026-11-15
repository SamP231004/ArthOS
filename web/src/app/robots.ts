import type { MetadataRoute } from "next";
import { absolute } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // signed-in screens: private and empty to a crawler
      disallow: ["/dashboard", "/onboarding"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
