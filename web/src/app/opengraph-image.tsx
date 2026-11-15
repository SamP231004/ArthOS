import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "ArthOS — your personal financial operating system";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Free budget & investment tracker for India", title: "Know what comes in, what goes out, what grows and what remains." });
}
