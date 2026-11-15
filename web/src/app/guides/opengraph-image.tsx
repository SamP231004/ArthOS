import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Personal finance guides for India · ArthOS";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Plain words · Indian examples", title: "Personal finance guides for India" });
}
