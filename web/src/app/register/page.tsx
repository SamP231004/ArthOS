import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create a free account", description: "Create a free ArthOS account: save first automatically, one daily budget number, live investment tracking and clear insights.", alternates: { canonical: "/register" } };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
