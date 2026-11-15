import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Free money calculators for India · ArthOS";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "No sign-up · private · in rupees", title: "Free money calculators for India" });
}
