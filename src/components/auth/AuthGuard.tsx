"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { UserType } from "@/types/database";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedUserTypes?: UserType[];
  requireAuth?: boolean;
}

export function AuthGuard({
  children,
  allowedUserTypes,
  requireAuth = true,
}: AuthGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      router.push("/auth/signin");
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
  }, [user, profile, loading, requireAuth, allowedUserTypes, router]);

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

  if (
    allowedUserTypes &&
    profile &&
    !allowedUserTypes.includes(profile.user_type)
  ) {
    return null;
  }

  return <>{children}</>;
}
