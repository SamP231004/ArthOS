import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ARTH_OFFSET, ARTH_PATH } from "@/lib/brand";

// Shared social-preview card (1200×630) for the home page, calculators and guides, in the Forest theme.
export const OG_SIZE = { width: 1200, height: 630 };

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/Newsreader_500Medium.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Manrope_600SemiBold.ttf")),
]);

export async function ogImage({ eyebrow, title, footer = "os-arth.vercel.app" }: { eyebrow: string; title: string; footer?: string }) {
  const [serif, sans] = await fonts;
  const long = title.length > 60;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(70% 90% at 15% 0%, rgba(196,58,53,0.28), transparent 60%), linear-gradient(180deg, #12301f 0%, #06110c 100%)",
          color: "#f2efe8",
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              display: "flex",
              background: "linear-gradient(135deg, #c43a35 0%, #a31c1b 55%, #6e1110 100%)",
            }}
          >
            <svg width="64" height="64" viewBox="0 0 32 32">
              <path transform={`translate(${ARTH_OFFSET.x} ${ARTH_OFFSET.y})`} fill="#fff7f3" d={ARTH_PATH} />
            </svg>
          </div>
          <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 44 }}>
            Arth<span style={{ color: "#ec7a74" }}>OS</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 28, color: "#ec7a74" }}>{eyebrow}</div>
          <div style={{ fontFamily: "Newsreader", fontSize: long ? 62 : 74, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#a5b0a9" }}>
          <span>Save first · One daily number · Investments · Insights</span>
          <span>{footer}</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Newsreader", data: serif, style: "normal", weight: 500 },
        { name: "Manrope", data: sans, style: "normal", weight: 600 },
      ],
    },
  );
}
