"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Campaign, Post, User, CreatorProfile } from "@/types/database";
import {
  FileVideo,
  Check,
  X,
  Clock,
  Loader2,
  ExternalLink,
  Search,
  TrendingUp,
  Instagram,
  Youtube,
  Eye,
  PlayCircle,
  AlertCircle,
  CheckCircle,
  Filter,
} from "lucide-react";

interface PostWithDetails extends Post {
  campaign?: Campaign;
  creator?: User;
  creator_profile?: CreatorProfile;
}

export default function PostReviewPage() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Post preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<PostWithDetails | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch brand's campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("brand_id", profile.id)
        .order("created_at", { ascending: false });

      if (campaignsData) {
        setCampaigns(campaignsData as Campaign[]);

        const campaignIds = campaignsData.map((c) => c.id);

        if (campaignIds.length > 0) {
          // Fetch posts for all campaigns
          const { data: postsData } = await supabase
            .from("posts")
            .select("*")
            .in("campaign_id", campaignIds)
            .order("submitted_at", { ascending: false });

          if (postsData && postsData.length > 0) {
            // Get unique creator IDs
            const creatorIds = [...new Set(postsData.map((p) => p.creator_id))];

            // Fetch creator users
            const { data: usersData } = await supabase
              .from("users")
              .select("*")
              .in("id", creatorIds);

            // Fetch creator profiles
            const { data: profilesData } = await supabase
              .from("creator_profiles")
              .select("*")
              .in("user_id", creatorIds);

            // Combine all data
            const postsWithDetails: PostWithDetails[] = postsData.map((post) => ({
              ...post,
              campaign: campaignsData.find((c) => c.id === post.campaign_id),
              creator: usersData?.find((u) => u.id === post.creator_id),
              creator_profile: profilesData?.find((p) => p.user_id === post.creator_id),
            }));

            setPosts(postsWithDetails as PostWithDetails[]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (post: PostWithDetails) => {
    setActionLoading(post.id);

    try {
      console.log("Approving post:", post.id);

      const { data, error } = await supabase
        .from("posts")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .select()
        .single();

      console.log("Approve result:", { data, error });

      if (error) {
        console.error("Approve error details:", error);
        throw new Error(error.message || "Failed to approve post");
      }

      // Update local state
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, status: "approved", approved_at: new Date().toISOString() }
            : p
        )
      );

      // Close preview dialog if open
      if (previewDialogOpen && previewPost?.id === post.id) {
        setPreviewDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error approving post:", error);
      alert(error.message || "Failed to approve post. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (post: PostWithDetails) => {
    setSelectedPost(post);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedPost) return;
    setActionLoading(selectedPost.id);

    try {
      console.log("Rejecting post:", selectedPost.id);

      const { data, error } = await supabase
        .from("posts")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || null,
        })
        .eq("id", selectedPost.id)
        .select()
        .single();

      console.log("Reject result:", { data, error });

      if (error) {
        console.error("Reject error details:", error);
        throw new Error(error.message || "Failed to reject post");
      }

      // Update local state
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? { ...p, status: "rejected", rejection_reason: rejectionReason || null }
            : p
        )
      );

      setRejectDialogOpen(false);
      setSelectedPost(null);

      // Close preview dialog if open
      if (previewDialogOpen && previewPost?.id === selectedPost.id) {
        setPreviewDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error rejecting post:", error);
      alert(error.message || "Failed to reject post. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const openPreviewDialog = (post: PostWithDetails) => {
    setPreviewPost(post);
    setPreviewDialogOpen(true);
  };

  const filteredPosts = posts.filter((post) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCreator = post.creator?.full_name?.toLowerCase().includes(query);
      const matchesTitle = post.title?.toLowerCase().includes(query);
      const matchesCampaign = post.campaign?.title?.toLowerCase().includes(query);
      if (!matchesCreator && !matchesTitle && !matchesCampaign) return false;
    }

    // Campaign filter
    if (selectedCampaign !== "all" && post.campaign_id !== selectedCampaign) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all" && post.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" /> Approved
          </Badge>
        );
      case "tracking":
        return (
          <Badge className="gap-1">
            <TrendingUp className="h-3 w-3" /> Tracking
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return <span className="font-bold text-sm">TT</span>;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      default:
        return <FileVideo className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "tiktok":
        return "bg-black text-white";
      case "youtube":
        return "bg-red-600 text-white";
      case "instagram":
        return "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white";
      default:
        return "bg-gray-500 text-white";
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

  const getTotalFollowers = (creatorProfile?: CreatorProfile) => {
    if (!creatorProfile) return 0;
    return (
      (creatorProfile.tiktok_followers || 0) +
      (creatorProfile.youtube_subscribers || 0) +
      (creatorProfile.instagram_followers || 0)
    );
  };

  const pendingCount = posts.filter((p) => p.status === "pending").length;

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Review Posts</h1>
              <p className="text-muted-foreground mt-1">
                Review and approve content submitted by creators.
              </p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="warning" className="text-sm px-3 py-1">
                {pendingCount} pending review
              </Badge>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by creator name, post title, or campaign..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="tracking">Tracking</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileVideo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No posts found</h3>
                <p className="text-muted-foreground">
                  {posts.length === 0
                    ? "No creators have submitted posts yet."
                    : "No posts match your current filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Post Thumbnail / Platform Icon */}
                      <div className="flex-shrink-0">
                        <div
                          className={`h-24 w-24 rounded-lg flex items-center justify-center ${getPlatformColor(
                            post.platform
                          )}`}
                        >
                          {post.thumbnail_url ? (
                            <img
                              src={post.thumbnail_url}
                              alt={post.title || "Post thumbnail"}
                              className="h-full w-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              {getPlatformIcon(post.platform)}
                              <PlayCircle className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Post Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-lg">
                                {post.title || "Untitled Post"}
                              </h3>
                              {getStatusBadge(post.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Campaign:{" "}
                              <Link
                                href={`/campaigns/${post.campaign_id}`}
                                className="font-medium text-foreground hover:underline"
                              >
                                {post.campaign?.title}
                              </Link>
                            </p>
                          </div>
                        </div>

                        {/* Creator Info */}
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={post.creator?.profile_image || undefined}
                              alt={post.creator?.full_name}
                            />
                            <AvatarFallback>
                              {getInitials(post.creator?.full_name || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {post.creator?.full_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {formatNumber(getTotalFollowers(post.creator_profile))} followers
                              </span>
                              {post.creator_profile?.tiktok_followers ? (
                                <span>TT: {formatNumber(post.creator_profile.tiktok_followers)}</span>
                              ) : null}
                              {post.creator_profile?.youtube_subscribers ? (
                                <span>YT: {formatNumber(post.creator_profile.youtube_subscribers)}</span>
                              ) : null}
                              {post.creator_profile?.instagram_followers ? (
                                <span>IG: {formatNumber(post.creator_profile.instagram_followers)}</span>
                              ) : null}
                            </div>
                          </div>
                          <Link href={`/creators/${post.creator_id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Profile
                            </Button>
                          </Link>
                        </div>

                        {/* Timestamps */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span>Submitted {formatDate(post.submitted_at)}</span>
                          {post.approved_at && (
                            <span className="text-green-600">
                              Approved {formatDate(post.approved_at)}
                            </span>
                          )}
                        </div>

                        {/* Rejection Reason */}
                        {post.rejection_reason && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div>
                              <p className="font-medium text-destructive">Rejection Feedback</p>
                              <p className="text-muted-foreground">{post.rejection_reason}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 lg:w-40">
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" className="w-full gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View Post
                          </Button>
                        </a>
                        {post.status === "pending" && (
                          <>
                            <Button
                              onClick={() => handleApprove(post)}
                              disabled={actionLoading === post.id}
                              className="bg-green-600 hover:bg-green-700 w-full"
                            >
                              {actionLoading === post.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => openRejectDialog(post)}
                              disabled={actionLoading === post.id}
                              className="w-full"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {posts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posts Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">{posts.length}</p>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                    <p className="text-3xl font-bold text-yellow-600">
                      {posts.filter((p) => p.status === "pending").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-500/10">
                    <p className="text-3xl font-bold text-green-600">
                      {posts.filter((p) => p.status === "approved").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-500/10">
                    <p className="text-3xl font-bold text-blue-600">
                      {posts.filter((p) => p.status === "tracking" || p.status === "completed").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Active/Completed</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-500/10">
                    <p className="text-3xl font-bold text-red-600">
                      {posts.filter((p) => p.status === "rejected").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Post</DialogTitle>
              <DialogDescription>
                Provide feedback to {selectedPost?.creator?.full_name} about why their post
                doesn't meet the campaign requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedPost && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{selectedPost.title || "Untitled Post"}</p>
                  <p className="text-xs text-muted-foreground">
                    Campaign: {selectedPost.campaign?.title}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Feedback for Creator *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain what needs to be changed or why this post doesn't meet the requirements..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This feedback will be visible to the creator so they can improve and resubmit.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading === selectedPost?.id || !rejectionReason.trim()}
              >
                {actionLoading === selectedPost?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AuthGuard>
  );
}
