"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { UserType } from "@/types/database";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedUserTypes?: UserType[];
  requireAuth?: boolean;
  skipOnboarding?: boolean;
}

export function AuthGuard({
  children,
  allowedUserTypes,
  requireAuth = true,
  skipOnboarding = false,
}: AuthGuardProps) {
  const { user, profile, loading, needsOnboarding } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      router.push("/auth/signin");
      return;
    }

    // Redirect brand users to onboarding if they haven't completed it
    if (
      !skipOnboarding &&
      needsOnboarding &&
      !pathname.startsWith("/onboarding")
    ) {
      router.push("/onboarding/brand");
      return;
    }

    if (
      allowedUserTypes &&
      profile &&
      !allowedUserTypes.includes(profile.user_type)
    ) {
      // Redirect to appropriate dashboard based on user type
      if (profile.user_type === "brand") {
        router.push("/dashboard/brand");
      } else {
        router.push("/dashboard/creator");
      }
    }
  }, [user, profile, loading, requireAuth, allowedUserTypes, router, needsOnboarding, pathname, skipOnboarding]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  // Don't render if brand needs onboarding (unless on onboarding page)
  if (
    !skipOnboarding &&
    needsOnboarding &&
    !pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  if (
    allowedUserTypes &&
    profile &&
    !allowedUserTypes.includes(profile.user_type)
  ) {
    return null;
  }

  return <>{children}</>;
}
