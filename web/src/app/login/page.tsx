import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to ArthOS on the web — the same account as the Android app.", alternates: { canonical: "/login" } };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
