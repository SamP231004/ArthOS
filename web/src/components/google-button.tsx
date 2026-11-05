"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/lib/button";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { AuthResponse } from "@/lib/types";

type TokenResponse = { access_token?: string; error?: string; error_description?: string };
type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
type Gis = {
  accounts: {
    oauth2: {
      initTokenClient: (o: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type: string; message?: string }) => void;
      }) => TokenClient;
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
  if (window.google?.accounts?.oauth2) return Promise.resolve();
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

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * "Continue with Google": our own button (matches the design in both themes) driving Google's popup token flow.
 * The backend verifies the token was issued to our client ID before signing the user in. The client ID comes
 * from /api/auth/providers, so the button only appears once GOOGLE_CLIENT_ID is set on the backend.
 */
export function GoogleButton({ onError }: { onError?: (message: string) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const setSession = useAuth((s) => s.setSession);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const client = useRef<TokenClient | null>(null);
  const { data } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: () => api<{ google?: { clientId: string } }>("/api/auth/providers", { auth: false }),
    staleTime: Infinity,
  });
  const clientId = data?.google?.clientId;

  const handlers = useRef({ onError, router, qc, setSession });
  useEffect(() => {
    handlers.current = { onError, router, qc, setSession };
  }, [onError, router, qc, setSession]);

  // The token client must exist before the click, so the popup opens directly from the user's gesture.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !window.google) return;
        client.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: async (resp) => {
            const h = handlers.current;
            if (!resp.access_token) {
              setBusy(false);
              if (resp.error && resp.error !== "access_denied") h.onError?.(resp.error_description ?? "Google sign-in failed");
              return;
            }
            try {
              const res = await api<AuthResponse>("/api/auth/google", { method: "POST", body: { accessToken: resp.access_token }, auth: false });
              h.qc.clear();
              h.setSession(res.token, res.user);
              h.router.replace(res.user.onboardingCompleted ? "/dashboard" : "/onboarding");
            } catch (e) {
              h.onError?.(e instanceof ApiError ? e.message : "Google sign-in failed");
            } finally {
              setBusy(false);
            }
          },
          // popup closed or blocked: just stop the spinner
          error_callback: () => setBusy(false),
        });
        setReady(true);
      })
      .catch((e: Error) => handlers.current.onError?.(e.message));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;
  return (
    <button
      type="button"
      disabled={!ready || busy}
      onClick={() => {
        setBusy(true);
        client.current?.requestAccessToken({ prompt: "" });
      }}
      className={`${buttonClass("secondary", "lg")} w-full`}
    >
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <GoogleG />}
      {busy ? "Waiting for Google…" : "Continue with Google"}
    </button>
  );
}
