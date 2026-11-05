"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/lib/button";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { AuthResponse } from "@/lib/types";

/** Starts a private, pre-filled sandbox session and drops the visitor straight into the dashboard. */
export function DemoButton({
  variant = "secondary",
  size = "md",
  className = "",
  children = "Explore the live demo",
}: {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const setSession = useAuth((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<AuthResponse>("/api/auth/demo", { method: "POST", auth: false });
      qc.clear();
      setSession(res.token, res.user);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start the demo");
    } finally {
      // Next.js preserves this page's state when the user navigates back, so never leave it "loading".
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-center gap-1.5">
      <button onClick={start} disabled={loading} className={`${buttonClass(variant, size)} ${className}`}>
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Play size={15} className="fill-current" />}
        {loading ? "Preparing your sandbox…" : children}
      </button>
      {error && <span className="text-xs text-expense">{error}</span>}
    </span>
  );
}
