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
import type { Campaign, Post, CreatorProfile, CampaignApplication } from "@/types/database";

interface ApplicationWithCampaign extends CampaignApplication {
  campaign?: Campaign;
}
import {
  DollarSign,
  TrendingUp,
  Eye,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface DashboardStats {
  totalEarnings: number;
  pendingEarnings: number;
  totalViews: number;
  activePosts: number;
}

export default function CreatorDashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    totalViews: 0,
    activePosts: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [myApplications, setMyApplications] = useState<ApplicationWithCampaign[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset loading state when component mounts or profile changes
    setLoading(true);

    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    try {
      // Fetch creator profile
      const { data: profileData } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", profile?.id)
        .single();

      if (profileData) {
        setCreatorProfile(profileData as CreatorProfile);
        setStats({
          totalEarnings: profileData.total_earnings || 0,
          pendingEarnings: profileData.pending_earnings || 0,
          totalViews: 0,
          activePosts: 0,
        });
      }

      // Fetch recent campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (campaignsData) {
        setRecentCampaigns(campaignsData as Campaign[]);
      }

      // Fetch recent posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("creator_id", profile?.id)
        .order("submitted_at", { ascending: false })
        .limit(5);

      if (postsData) {
        setRecentPosts(postsData as Post[]);
        setStats((prev) => ({
          ...prev,
          activePosts: postsData.filter(
            (p) => p.status === "tracking" || p.status === "approved"
          ).length,
        }));
      }

      // Fetch my applications
      const { data: applicationsData } = await supabase
        .from("campaign_applications")
        .select("*")
        .eq("creator_id", profile?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (applicationsData && applicationsData.length > 0) {
        const apps = applicationsData as CampaignApplication[];
        const campaignIds = apps.map((a) => a.campaign_id);

        const { data: appCampaignsData } = await supabase
          .from("campaigns")
          .select("*")
          .in("id", campaignIds);

        const appCampaigns = appCampaignsData as Campaign[] | null;

        const appsWithCampaigns = apps.map((app) => ({
          ...app,
          campaign: appCampaigns?.find((c) => c.id === app.campaign_id),
        }));

        setMyApplications(appsWithCampaigns);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "tracking":
        return <Badge>Tracking</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return "TT";
      case "youtube":
        return "YT";
      case "instagram":
        return "IG";
      default:
        return platform.slice(0, 2).toUpperCase();
    }
  };

  return (
    <AuthGuard allowedUserTypes={["creator"]}>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {profile?.full_name?.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your creator activity.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Earnings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Earnings
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.pendingEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting payout
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
                  Across all posts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Posts
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activePosts}</div>
                <p className="text-xs text-muted-foreground">
                  Being tracked
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Applications */}
          {myApplications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myApplications.map((app) => (
                    <Link
                      key={app.id}
                      href={`/campaigns/${app.campaign_id}`}
                      className="block"
                    >
                      <div className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {app.campaign?.title || "Campaign"}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Applied {formatDate(app.created_at)}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {getApplicationStatusBadge(app.status)}
                          </div>
                        </div>
                        {app.status === "approved" && (
                          <div className="mt-2 pt-2 border-t">
                            <Button size="sm" className="w-full">
                              Submit Post
                            </Button>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Campaigns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Available Campaigns</CardTitle>
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
                        className="h-16 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : recentCampaigns.length > 0 ? (
                  <div className="space-y-3">
                    {recentCampaigns.map((campaign) => (
                      <Link
                        key={campaign.id}
                        href={`/campaigns/${campaign.id}`}
                        className="block"
                      >
                        <div className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">
                                {campaign.title}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {campaign.description}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium text-primary">
                                {formatCurrency(campaign.payout_rate.per_view)}
                                /view
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(campaign.budget)} budget
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {campaign.requirements.platforms.map((platform) => (
                              <Badge
                                key={platform}
                                variant="secondary"
                                className="text-xs"
                              >
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active campaigns available.</p>
                    <p className="text-sm">Check back later for new opportunities!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Posts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Posts</CardTitle>
                <Link href="/posts">
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
                ) : recentPosts.length > 0 ? (
                  <div className="space-y-3">
                    {recentPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-lg border flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                              post.platform === "tiktok"
                                ? "platform-tiktok"
                                : post.platform === "youtube"
                                ? "platform-youtube"
                                : "platform-instagram"
                            }`}
                          >
                            {getPlatformIcon(post.platform)}
                          </div>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[200px]">
                              {post.title || "Untitled Post"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(post.submitted_at)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(post.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No posts yet.</p>
                    <Link href="/campaigns">
                      <Button variant="link" className="mt-2">
                        Browse campaigns to get started
                      </Button>
                    </Link>
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
                <Link href="/campaigns">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Browse Campaigns
                  </Button>
                </Link>
                <Link href="/posts/new">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="h-4 w-4" />
                    Submit New Post
                  </Button>
                </Link>
                <Link href="/earnings">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <DollarSign className="h-4 w-4" />
                    View Earnings
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Update Profile
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
