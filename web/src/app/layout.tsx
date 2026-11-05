import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Newsreader, Noto_Sans_Devanagari, Tiro_Devanagari_Hindi } from "next/font/google";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/lib/theme-script";
import "./globals.css";

// Type system: Newsreader (editorial serif, optical sizes) for display, Manrope for interface and figures,
// IBM Plex Mono for labels, Tiro Devanagari Hindi for display Hindi (matches the logo), Noto for UI Hindi.
const sans = Manrope({ variable: "--font-ui", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });
const mono = IBM_Plex_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400", "500"] });
const devaDisplay = Tiro_Devanagari_Hindi({ variable: "--font-deva-display", subsets: ["devanagari"], weight: "400", style: ["normal", "italic"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "ArthOS — Take control of your अर्थ", template: "%s · ArthOS" },
  description:
    "ArthOS is a personal financial operating system. Income, expenses, budgets, investments and net worth — in one calm, intelligent place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06110c" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${mono.variable} ${devaDisplay.variable} ${deva.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
