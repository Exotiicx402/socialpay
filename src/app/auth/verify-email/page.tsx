"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Suspense } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Check if user is now verified
  const checkVerification = async () => {
    setCheckingVerification(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        // User is verified, redirect to dashboard
        router.push("/dashboard/creator");
      }
    } catch (err) {
      console.error("Error checking verification:", err);
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;

    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) throw error;

      setResendSuccess(true);
    } catch (err: any) {
      console.error("Error resending verification:", err);
      setResendError(err.message || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to{" "}
            {email ? <strong>{email}</strong> : "your email address"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Next steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>You'll be redirected back to sign in</li>
            </ol>
          </div>

          {resendSuccess && (
            <div className="p-3 rounded-lg bg-green-100 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Verification email sent successfully!
            </div>
          )}

          {resendError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {resendError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={resending || !email}
              className="w-full"
            >
              {resending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Resend Verification Email
            </Button>

            <Button
              variant="ghost"
              onClick={checkVerification}
              disabled={checkingVerification}
              className="w-full"
            >
              {checkingVerification ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              I've Verified My Email
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="text-center text-sm text-muted-foreground">
            Wrong email?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up again
            </Link>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
