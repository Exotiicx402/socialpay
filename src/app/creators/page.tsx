"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/utils";
import type { Campaign, CampaignApplication, User, CreatorProfile, Post } from "@/types/database";
import {
  Users,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  TrendingUp,
  Instagram,
  Youtube,
  Eye,
  FileVideo,
  Clock,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

interface CreatorWithDetails {
  user: User;
  creator_profile?: CreatorProfile;
  applications: (CampaignApplication & { campaign?: Campaign })[];
  posts: Post[];
}

export default function CreatorsPage() {
  const { profile } = useAuth();
  const [creators, setCreators] = useState<CreatorWithDetails[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

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
          // Fetch approved applications
          const { data: applicationsData } = await supabase
            .from("campaign_applications")
            .select("*")
            .in("campaign_id", campaignIds)
            .eq("status", "approved");

          if (applicationsData && applicationsData.length > 0) {
            // Get unique creator IDs
            const creatorIds = [...new Set(applicationsData.map((a) => a.creator_id))];

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

            // Fetch posts from these creators for brand's campaigns
            const { data: postsData } = await supabase
              .from("posts")
              .select("*")
              .in("campaign_id", campaignIds)
              .in("creator_id", creatorIds);

            // Build creator details
            const creatorsWithDetails: CreatorWithDetails[] = (usersData || []).map((user) => {
              const userApplications = (applicationsData || [])
                .filter((a) => a.creator_id === user.id)
                .map((app) => ({
                  ...app,
                  campaign: campaignsData.find((c) => c.id === app.campaign_id),
                }));

              const userPosts = (postsData || []).filter((p) => p.creator_id === user.id);

              return {
                user: user as User,
                creator_profile: (profilesData || []).find((p) => p.user_id === user.id) as CreatorProfile | undefined,
                applications: userApplications,
                posts: userPosts as Post[],
              };
            });

            setCreators(creatorsWithDetails);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = creators.filter((creator) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = creator.user.full_name?.toLowerCase().includes(query);
      const matchesEmail = creator.user.email?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail) return false;
    }

    // Campaign filter
    if (selectedCampaign !== "all") {
      const inCampaign = creator.applications.some((a) => a.campaign_id === selectedCampaign);
      if (!inCampaign) return false;
    }

    return true;
  });

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

  const getPostStats = (posts: Post[]) => {
    const total = posts.length;
    const approved = posts.filter((p) => p.status === "approved" || p.status === "tracking" || p.status === "completed").length;
    const pending = posts.filter((p) => p.status === "pending").length;
    return { total, approved, pending };
  };

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Your Creators</h1>
              <p className="text-muted-foreground mt-1">
                Manage creators who have been approved for your campaigns.
              </p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {creators.length} active creator{creators.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search creators by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-64">
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creators List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCreators.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No creators found</h3>
                <p className="text-muted-foreground mb-4">
                  {creators.length === 0
                    ? "You haven't approved any creator applications yet."
                    : "No creators match your current search or filters."}
                </p>
                {creators.length === 0 && (
                  <Link href="/applications">
                    <Button>Review Applications</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCreators.map((creator) => {
                const postStats = getPostStats(creator.posts);
                return (
                  <Card key={creator.user.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      {/* Creator Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage
                            src={creator.user.profile_image || undefined}
                            alt={creator.user.full_name}
                          />
                          <AvatarFallback className="text-lg">
                            {getInitials(creator.user.full_name || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {creator.user.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {creator.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Follower Stats */}
                      <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="font-semibold">
                            {formatNumber(getTotalFollowers(creator.creator_profile))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {creator.creator_profile?.tiktok_followers ? (
                            <span className="flex items-center gap-1">
                              <span className="font-bold text-xs">TT</span>
                              {formatNumber(creator.creator_profile.tiktok_followers)}
                            </span>
                          ) : null}
                          {creator.creator_profile?.youtube_subscribers ? (
                            <span className="flex items-center gap-1">
                              <Youtube className="h-3 w-3" />
                              {formatNumber(creator.creator_profile.youtube_subscribers)}
                            </span>
                          ) : null}
                          {creator.creator_profile?.instagram_followers ? (
                            <span className="flex items-center gap-1">
                              <Instagram className="h-3 w-3" />
                              {formatNumber(creator.creator_profile.instagram_followers)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Campaigns */}
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Campaigns</p>
                        <div className="flex flex-wrap gap-1">
                          {creator.applications.map((app) => (
                            <Link key={app.id} href={`/campaigns/${app.campaign_id}`}>
                              <Badge
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80 text-xs"
                              >
                                {app.campaign?.title}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Post Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 rounded bg-muted/30">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <FileVideo className="h-3 w-3" />
                          </div>
                          <p className="text-lg font-semibold">{postStats.total}</p>
                          <p className="text-xs text-muted-foreground">Posts</p>
                        </div>
                        <div className="text-center p-2 rounded bg-green-500/10">
                          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                            <CheckCircle className="h-3 w-3" />
                          </div>
                          <p className="text-lg font-semibold text-green-600">{postStats.approved}</p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                        <div className="text-center p-2 rounded bg-yellow-500/10">
                          <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                            <Clock className="h-3 w-3" />
                          </div>
                          <p className="text-lg font-semibold text-yellow-600">{postStats.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" asChild>
                          <Link href={`/creators/${creator.user.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Link>
                        </Button>
                        <Button variant="outline" size="icon">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Summary Stats */}
          {creators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Creator Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">{creators.length}</p>
                    <p className="text-sm text-muted-foreground">Total Creators</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">
                      {formatNumber(
                        creators.reduce((sum, c) => sum + getTotalFollowers(c.creator_profile), 0)
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Combined Reach</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">
                      {creators.reduce((sum, c) => sum + c.posts.length, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">
                      {creators.reduce(
                        (sum, c) =>
                          sum + c.posts.filter((p) => p.status === "completed").length,
                        0
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Completed Posts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
