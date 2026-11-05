"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import type { AuthResponse } from "@/lib/types";

type Gis = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gis;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error("Couldn't load Google sign-in"));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/**
 * "Continue with Google" via Google Identity Services. The client ID comes from the backend
 * (/api/auth/providers), so the button only appears once GOOGLE_CLIENT_ID is set there.
 */
export function GoogleButton({ onError }: { onError?: (message: string) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const theme = useTheme();
  const setSession = useAuth((s) => s.setSession);
  const box = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: () => api<{ google?: { clientId: string } }>("/api/auth/providers", { auth: false }),
    staleTime: Infinity,
  });
  const clientId = data?.google?.clientId;

  // keep the latest callbacks without re-initialising GIS
  const handlers = useRef({ onError, router, qc, setSession });
  useEffect(() => {
    handlers.current = { onError, router, qc, setSession };
  }, [onError, router, qc, setSession]);

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !box.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            const h = handlers.current;
            setBusy(true);
            try {
              const res = await api<AuthResponse>("/api/auth/google", { method: "POST", body: { credential }, auth: false });
              h.qc.clear();
              h.setSession(res.token, res.user);
              h.router.replace(res.user.onboardingCompleted ? "/dashboard" : "/onboarding");
            } catch (e) {
              h.onError?.(e instanceof ApiError ? e.message : "Google sign-in failed");
            } finally {
              setBusy(false);
            }
          },
        });
        box.current.innerHTML = "";
        window.google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          logo_alignment: "center",
          width: Math.min(400, box.current.clientWidth || 400),
        });
      })
      .catch((e: Error) => handlers.current.onError?.(e.message));
    return () => {
      cancelled = true;
    };
  }, [clientId, theme]);

  if (!clientId) return null;
  return (
    <div className="relative">
      <div ref={box} className={`flex min-h-[44px] justify-center overflow-hidden rounded-xl tracking-normal transition [font-feature-settings:normal] [&_*]:[font-feature-settings:normal] ${busy ? "pointer-events-none opacity-50" : ""}`} />
      {busy && <span className="absolute inset-0 grid place-items-center text-xs text-muted">Signing you in…</span>}
    </div>
  );
}
