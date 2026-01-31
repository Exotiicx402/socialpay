"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import type { Campaign, CampaignApplication, BrandProfile } from "@/types/database";
import {
  DollarSign,
  Megaphone,
  Users,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Eye,
  Clock,
} from "lucide-react";

interface DashboardStats {
  totalSpent: number;
  activeCampaigns: number;
  totalCreators: number;
  totalViews: number;
}

export default function BrandDashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSpent: 0,
    activeCampaigns: 0,
    totalCreators: 0,
    totalViews: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pendingApplications, setPendingApplications] = useState<
    (CampaignApplication & { campaign?: Campaign })[]
  >([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      // Fetch brand profile
      const { data: profileData } = await supabase
        .from("brand_profiles")
        .select("*")
        .eq("user_id", profile?.id)
        .single();

      if (profileData) {
        setBrandProfile(profileData as BrandProfile);
        setStats((prev) => ({
          ...prev,
          totalSpent: profileData.total_spent || 0,
          activeCampaigns: profileData.active_campaigns || 0,
        }));
      }

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("brand_id", profile?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (campaignsData) {
        setCampaigns(campaignsData as Campaign[]);
        setStats((prev) => ({
          ...prev,
          activeCampaigns: campaignsData.filter((c) => c.status === "active")
            .length,
        }));
      }

      // Fetch pending applications for brand's campaigns
      if (campaignsData && campaignsData.length > 0) {
        const campaignIds = campaignsData.map((c) => c.id);
        const { data: applicationsData } = await supabase
          .from("campaign_applications")
          .select("*")
          .in("campaign_id", campaignIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        if (applicationsData) {
          const applicationsWithCampaigns = applicationsData.map((app) => ({
            ...app,
            campaign: campaignsData.find((c) => c.id === app.campaign_id),
          }));
          setPendingApplications(
            applicationsWithCampaigns as (CampaignApplication & {
              campaign?: Campaign;
            })[]
          );
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "paused":
        return <Badge variant="warning">Paused</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {profile?.company_name || profile?.full_name}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your campaigns and connect with creators.
              </p>
            </div>
            <Link href="/campaigns/new">
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Spent
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalSpent)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime campaign spend
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Campaigns
                </CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Creators
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCreators}</div>
                <p className="text-xs text-muted-foreground">
                  Partnered with
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Views
                </CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(stats.totalViews)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Campaign reach
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Campaigns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Campaigns</CardTitle>
                <Link href="/campaigns">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-20 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : campaigns.length > 0 ? (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <Link
                        key={campaign.id}
                        href={`/campaigns/${campaign.id}`}
                        className="block"
                      >
                        <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium">{campaign.title}</h4>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Budget: {formatCurrency(campaign.budget)}
                            </span>
                            <span>Spent: {formatCurrency(campaign.spent)}</span>
                          </div>
                          <div className="mt-2 w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  (campaign.spent / campaign.budget) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No campaigns yet.</p>
                    <Link href="/campaigns/new">
                      <Button variant="link" className="mt-2">
                        Create your first campaign
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Applications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pending Applications</CardTitle>
                <Link href="/applications">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : pendingApplications.length > 0 ? (
                  <div className="space-y-3">
                    {pendingApplications.map((application) => (
                      <div
                        key={application.id}
                        className="p-3 rounded-lg border flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            New application for{" "}
                            <span className="text-primary">
                              {application.campaign?.title}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(application.created_at)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No pending applications.</p>
                    <p className="text-sm">
                      Applications will appear here when creators apply.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/campaigns/new">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
                <Link href="/creators">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Users className="h-4 w-4" />
                    Browse Creators
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <TrendingUp className="h-4 w-4" />
                    View Analytics
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
