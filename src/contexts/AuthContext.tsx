"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { User, UserType, Company } from "@/types/database";

interface AuthContextType {
  user: SupabaseUser | null;
  profile: User | null;
  company: Company | null;
  session: Session | null;
  loading: boolean;
  needsOnboarding: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    userType: UserType,
    companyName?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if brand user needs to complete onboarding
  const needsOnboarding = !!(
    profile &&
    profile.user_type === "brand" &&
    !profile.company_id
  );

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as User;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }, []);

  const fetchCompany = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Company not found is expected for new brands
        if (error.code !== "PGRST116") {
          console.error("Error fetching company:", error);
        }
        return null;
      }

      return data as Company;
    } catch (error) {
      console.error("Error fetching company:", error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);

      // Also fetch company if brand
      if (profileData?.user_type === "brand") {
        const companyData = await fetchCompany(user.id);
        setCompany(companyData);
      }
    }
  }, [user, fetchProfile, fetchCompany]);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfile(currentSession.user.id);
          setProfile(profileData);

          // Fetch company if brand
          if (profileData?.user_type === "brand") {
            const companyData = await fetchCompany(currentSession.user.id);
            setCompany(companyData);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const profileData = await fetchProfile(newSession.user.id);
        setProfile(profileData);

        // Fetch company if brand
        if (profileData?.user_type === "brand") {
          const companyData = await fetchCompany(newSession.user.id);
          setCompany(companyData);
        }
      } else {
        setProfile(null);
        setCompany(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userType: UserType,
    companyName?: string
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            company_name: companyName,
          },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      console.error("Sign up error:", error);
      // Provide more helpful error message for network issues
      if (error.message === "Load failed" || error.name === "TypeError") {
        return {
          error: new Error("Network error - please check your internet connection and try again")
        };
      }
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting sign in for:", email);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: new Error("Sign in timed out. Please check your connection and try again.") });
        }, 15000);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const result = await Promise.race([signInPromise, timeoutPromise]);

      console.log("Sign in result:", { userId: result.data?.user?.id, error: result.error });

      if (result.error) {
        return { error: result.error };
      }

      return { error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      // Provide more helpful error message for network issues
      if (error.message === "Load failed" || error.name === "TypeError" || error.message?.includes("fetch")) {
        return {
          error: new Error("Network error - please check your internet connection and try again")
        };
      }
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCompany(null);
    setSession(null);
  };

  const value = {
    user,
    profile,
    company,
    session,
    loading,
    needsOnboarding,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
