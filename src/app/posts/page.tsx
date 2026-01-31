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
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Post, Campaign } from "@/types/database";
import { PlusCircle, ExternalLink, Eye, Heart, MessageCircle } from "lucide-react";

export default function PostsPage() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<(Post & { campaign?: Campaign })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchPosts();
    }
  }, [profile]);

  const fetchPosts = async () => {
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("creator_id", profile?.id)
        .order("submitted_at", { ascending: false });

      if (postsData && postsData.length > 0) {
        // Fetch associated campaigns
        const campaignIds = [...new Set(postsData.map((p) => p.campaign_id))];
        const { data: campaignsData } = await supabase
          .from("campaigns")
          .select("*")
          .in("id", campaignIds);

        const postsWithCampaigns = postsData.map((post) => ({
          ...post,
          campaign: campaignsData?.find((c) => c.id === post.campaign_id),
        }));

        setPosts(postsWithCampaigns as (Post & { campaign?: Campaign })[]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending Review</Badge>;
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

  const getPlatformStyles = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return "platform-tiktok";
      case "youtube":
        return "platform-youtube";
      case "instagram":
        return "platform-instagram";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <AuthGuard allowedUserTypes={["creator"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Posts</h1>
              <p className="text-muted-foreground mt-1">
                Track your submitted content and performance
              </p>
            </div>
            <Link href="/campaigns">
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Submit New Post
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-24 bg-muted animate-pulse rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid gap-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Platform Badge */}
                      <div
                        className={`h-16 w-16 rounded-lg flex items-center justify-center text-white font-bold ${getPlatformStyles(
                          post.platform
                        )}`}
                      >
                        {post.platform === "tiktok"
                          ? "TT"
                          : post.platform === "youtube"
                          ? "YT"
                          : "IG"}
                      </div>

                      {/* Post Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-medium">
                              {post.title || "Untitled Post"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Campaign: {post.campaign?.title || "Unknown"}
                            </p>
                          </div>
                          {getStatusBadge(post.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Submitted {formatDate(post.submitted_at)}</span>
                          {post.approved_at && (
                            <span>Approved {formatDate(post.approved_at)}</span>
                          )}
                        </div>

                        {post.rejection_reason && (
                          <p className="text-sm text-destructive mt-2">
                            Rejection reason: {post.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="gap-1">
                            <ExternalLink className="h-4 w-4" />
                            View Post
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any posts yet.
                </p>
                <Link href="/campaigns">
                  <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Browse Campaigns
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
