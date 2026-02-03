"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate, formatCurrency } from "@/lib/utils";
import type { Campaign, CampaignApplication, User, CreatorProfile, Post, PostMetrics } from "@/types/database";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  TrendingUp,
  Instagram,
  Youtube,
  Eye,
  FileVideo,
  Clock,
  CheckCircle,
  Globe,
  Mail,
  Calendar,
  DollarSign,
  Heart,
  MessageCircle,
  Share2,
  Play,
} from "lucide-react";

interface PostWithMetrics extends Post {
  metrics?: PostMetrics;
  campaign?: Campaign;
}

export default function CreatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<User | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [applications, setApplications] = useState<(CampaignApplication & { campaign?: Campaign })[]>([]);
  const [posts, setPosts] = useState<PostWithMetrics[]>([]);

  useEffect(() => {
    if (profile && params.id) {
      fetchCreatorData();
    }
  }, [profile, params.id]);

  const fetchCreatorData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch creator user
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", params.id)
        .single();

      if (userData) {
        setCreator(userData as User);

        // Fetch creator profile
        const { data: profileData } = await supabase
          .from("creator_profiles")
          .select("*")
          .eq("user_id", params.id)
          .single();

        if (profileData) {
          setCreatorProfile(profileData as CreatorProfile);
        }

        // Fetch brand's campaigns
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select("*")
          .eq("brand_id", profile.id);

        if (campaignsData) {
          const campaignIds = campaignsData.map((c) => c.id);

          // Fetch applications for this creator to brand's campaigns
          const { data: applicationsData } = await supabase
            .from("campaign_applications")
            .select("*")
            .eq("creator_id", params.id)
            .in("campaign_id", campaignIds)
            .eq("status", "approved");

          if (applicationsData) {
            const appsWithCampaigns = applicationsData.map((app) => ({
              ...app,
              campaign: campaignsData.find((c) => c.id === app.campaign_id),
            }));
            setApplications(appsWithCampaigns);
          }

          // Fetch posts from this creator for brand's campaigns
          const { data: postsData } = await supabase
            .from("posts")
            .select("*")
            .eq("creator_id", params.id)
            .in("campaign_id", campaignIds)
            .order("submitted_at", { ascending: false });

          if (postsData) {
            // Fetch metrics for posts
            const postIds = postsData.map((p) => p.id);
            const { data: metricsData } = await supabase
              .from("post_metrics")
              .select("*")
              .in("post_id", postIds);

            const postsWithMetrics = postsData.map((post) => ({
              ...post,
              metrics: metricsData?.find((m) => m.post_id === post.id),
              campaign: campaignsData.find((c) => c.id === post.campaign_id),
            }));

            setPosts(postsWithMetrics as PostWithMetrics[]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching creator data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTotalFollowers = () => {
    if (!creatorProfile) return 0;
    return (
      (creatorProfile.tiktok_followers || 0) +
      (creatorProfile.youtube_subscribers || 0) +
      (creatorProfile.instagram_followers || 0)
    );
  };

  const getPostStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending Review</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "tracking":
        return <Badge variant="secondary">Tracking</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalMetrics = posts.reduce(
    (acc, post) => ({
      views: acc.views + (post.metrics?.views || 0),
      likes: acc.likes + (post.metrics?.likes || 0),
      comments: acc.comments + (post.metrics?.comments || 0),
      shares: acc.shares + (post.metrics?.shares || 0),
      earnings: acc.earnings + (post.metrics?.earnings || 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, earnings: 0 }
  );

  if (loading) {
    return (
      <AuthGuard allowedUserTypes={["brand"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!creator) {
    return (
      <AuthGuard allowedUserTypes={["brand"]}>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Creator not found</h2>
            <p className="text-muted-foreground mb-4">
              This creator doesn't exist or isn't part of your campaigns.
            </p>
            <Button onClick={() => router.push("/creators")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Creators
            </Button>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.push("/creators")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Creators
          </Button>

          {/* Creator Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={creator.profile_image || undefined}
                    alt={creator.full_name}
                  />
                  <AvatarFallback className="text-2xl">
                    {getInitials(creator.full_name || "U")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{creator.full_name}</h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {creator.email}
                    </span>
                    {creator.website && (
                      <a
                        href={creator.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {formatDate(creator.created_at)}
                    </span>
                  </div>

                  {creator.bio && (
                    <p className="text-muted-foreground mb-4">{creator.bio}</p>
                  )}

                  {/* Social Stats */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-lg font-bold">{formatNumber(getTotalFollowers())}</p>
                        <p className="text-xs text-muted-foreground">Total Followers</p>
                      </div>
                    </div>

                    {creatorProfile?.tiktok_followers ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                        <span className="font-bold text-sm">TT</span>
                        <div>
                          <p className="font-semibold">{formatNumber(creatorProfile.tiktok_followers)}</p>
                          <p className="text-xs text-muted-foreground">TikTok</p>
                        </div>
                      </div>
                    ) : null}

                    {creatorProfile?.youtube_subscribers ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                        <Youtube className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-semibold">{formatNumber(creatorProfile.youtube_subscribers)}</p>
                          <p className="text-xs text-muted-foreground">YouTube</p>
                        </div>
                      </div>
                    ) : null}

                    {creatorProfile?.instagram_followers ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                        <Instagram className="h-5 w-5 text-pink-600" />
                        <div>
                          <p className="font-semibold">{formatNumber(creatorProfile.instagram_followers)}</p>
                          <p className="text-xs text-muted-foreground">Instagram</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{formatNumber(totalMetrics.views)}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="h-6 w-6 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold">{formatNumber(totalMetrics.likes)}</p>
                <p className="text-sm text-muted-foreground">Total Likes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MessageCircle className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{formatNumber(totalMetrics.comments)}</p>
                <p className="text-sm text-muted-foreground">Comments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Share2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{formatNumber(totalMetrics.shares)}</p>
                <p className="text-sm text-muted-foreground">Shares</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(totalMetrics.earnings)}</p>
                <p className="text-sm text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Active Campaigns</CardTitle>
                <CardDescription>
                  Campaigns this creator has been approved for
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No active campaigns
                  </p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <Link
                        key={app.id}
                        href={`/campaigns/${app.campaign_id}`}
                        className="block"
                      >
                        <div className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{app.campaign?.title}</p>
                              <p className="text-sm text-muted-foreground">
                                Approved {formatDate(app.updated_at)}
                              </p>
                            </div>
                            <Badge variant="success">Active</Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Categories */}
            {creatorProfile?.categories && creatorProfile.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Content Categories</CardTitle>
                  <CardDescription>
                    Types of content this creator produces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creatorProfile.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted Posts</CardTitle>
              <CardDescription>
                Content submitted for your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No posts submitted yet
                </p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-lg border flex flex-col md:flex-row md:items-center gap-4"
                    >
                      {/* Thumbnail */}
                      <div className="w-full md:w-32 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {post.thumbnail_url ? (
                          <img
                            src={post.thumbnail_url}
                            alt={post.title || "Post thumbnail"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Post Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-medium truncate">
                              {post.title || "Untitled Post"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {post.campaign?.title} • {post.platform}
                            </p>
                          </div>
                          {getPostStatusBadge(post.status)}
                        </div>

                        {/* Metrics */}
                        {post.metrics && (
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              {formatNumber(post.metrics.views)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              {formatNumber(post.metrics.likes)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              {formatNumber(post.metrics.comments)}
                            </span>
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(post.metrics.earnings)}
                            </span>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted {formatDate(post.submitted_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={post.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Post
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
