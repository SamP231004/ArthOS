import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "ArthOS — Take control of your अर्थ", template: "%s · ArthOS" },
  description:
    "ArthOS is a personal financial operating system. Income, expenses, budgets, investments and net worth — in one calm, intelligent place.",
};

export const viewport: Viewport = { themeColor: "#060608" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} ${deva.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
