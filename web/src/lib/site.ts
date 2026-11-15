// Plain module: used by metadata, the sitemap, JSON-LD and pages (server and client).

/** Public address of the website (no trailing slash). Override with NEXT_PUBLIC_SITE_URL for a custom domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://os-arth.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "ArthOS";
export const SITE_TAGLINE = "Take control of your अर्थ";
export const SITE_DESCRIPTION =
  "ArthOS is a free personal finance app for India: save first automatically, get one safe-to-spend number for today, track stocks, mutual funds and gold at live prices, and see clear insights. Web and Android.";

export const AUTHOR = { name: "Samarth Patel", url: "https://samp231004.github.io/Portfolio/" };
export const APK_URL = "https://github.com/SamP231004/ArthOS/releases/tag/android-latest";

/** Absolute URL for a site path ("/tools" → "https://…/tools"). */
export function absolute(path = "/"): string {
  return SITE_URL + (path.startsWith("/") ? path : `/${path}`);
}
