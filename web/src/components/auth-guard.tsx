"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, useHydrated } from "@/lib/auth-store";
import { Spinner } from "./ui";

/** Client-side guard: waits for the persisted session to load, then redirects if needed. */
export function AuthGuard({ requireOnboarded = true, children }: { requireOnboarded?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const { token, user } = useAuth();
  const hydrated = useHydrated();

  const needsLogin = hydrated && (!token || !user);
  const needsOnboarding = hydrated && !!user && requireOnboarded && !user.onboardingCompleted;

  useEffect(() => {
    if (needsLogin) router.replace("/login");
    else if (needsOnboarding) router.replace("/onboarding");
  }, [needsLogin, needsOnboarding, router]);

  if (!hydrated || needsLogin || needsOnboarding) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <>{children}</>;
}
