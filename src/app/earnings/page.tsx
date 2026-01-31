"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payout, CreatorProfile } from "@/types/database";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function EarningsPage() {
  const { profile } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchEarningsData();
    }
  }, [profile]);

  const fetchEarningsData = async () => {
    try {
      // Fetch creator profile
      const { data: profileData } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", profile?.id)
        .single();

      if (profileData) {
        setCreatorProfile(profileData as CreatorProfile);
      }

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("*")
        .eq("creator_id", profile?.id)
        .order("created_at", { ascending: false });

      if (payoutsData) {
        setPayouts(payoutsData as Payout[]);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "processing":
        return <Badge>Processing</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalEarnings = creatorProfile?.total_earnings || 0;
  const pendingEarnings = creatorProfile?.pending_earnings || 0;
  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const totalPaid = completedPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <AuthGuard allowedUserTypes={["creator"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Earnings</h1>
            <p className="text-muted-foreground mt-1">
              Track your earnings and payout history
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Earnings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Payout
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(pendingEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid Out
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedPayouts.length} payouts completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payout History */}
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              ) : payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            payout.status === "completed"
                              ? "bg-green-500/10"
                              : payout.status === "pending"
                              ? "bg-yellow-500/10"
                              : "bg-muted"
                          }`}
                        >
                          <DollarSign
                            className={`h-5 w-5 ${
                              payout.status === "completed"
                                ? "text-green-500"
                                : payout.status === "pending"
                                ? "text-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-medium">
                            {formatCurrency(payout.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(payout.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {payout.paid_at && (
                          <span className="text-sm text-muted-foreground">
                            Paid {formatDate(payout.paid_at)}
                          </span>
                        )}
                        {getStatusBadge(payout.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payouts yet.</p>
                  <p className="text-sm">
                    Start creating content to earn money!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
