"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { Campaign, CampaignApplication } from "@/types/database";
import {
  ArrowLeft,
  Loader2,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

function SubmitPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get("campaign");

  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [approvedCampaigns, setApprovedCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(
    campaignIdFromUrl || ""
  );
  const [postUrl, setPostUrl] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchApprovedCampaigns();
    }
  }, [profile]);

  const fetchApprovedCampaigns = async () => {
    try {
      // Get approved applications
      const { data: applications, error: appError } = await supabase
        .from("campaign_applications")
        .select("campaign_id")
        .eq("creator_id", profile?.id)
        .eq("status", "approved");

      if (appError) throw appError;

      if (applications && applications.length > 0) {
        const campaignIds = applications.map((a) => a.campaign_id);

        // Get campaign details
        const { data: campaigns, error: campError } = await supabase
          .from("campaigns")
          .select("*")
          .in("id", campaignIds)
          .eq("status", "active");

        if (campError) throw campError;

        setApprovedCampaigns((campaigns as Campaign[]) || []);

        // Auto-select campaign if provided in URL
        if (campaignIdFromUrl && campaigns?.some((c) => c.id === campaignIdFromUrl)) {
          setSelectedCampaign(campaignIdFromUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectPlatform = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("tiktok.com") || lowerUrl.includes("tiktok")) {
      return "tiktok";
    } else if (
      lowerUrl.includes("youtube.com") ||
      lowerUrl.includes("youtu.be")
    ) {
      return "youtube";
    } else if (
      lowerUrl.includes("instagram.com") ||
      lowerUrl.includes("instagr.am")
    ) {
      return "instagram";
    }
    return null;
  };

  const handleUrlChange = (url: string) => {
    setPostUrl(url);
    const platform = detectPlatform(url);
    setDetectedPlatform(platform);
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile?.id) {
      setError("You must be logged in to submit a post");
      return;
    }

    if (!selectedCampaign) {
      setError("Please select a campaign");
      return;
    }

    if (!postUrl.trim()) {
      setError("Please enter the post URL");
      return;
    }

    if (!validateUrl(postUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    if (!detectedPlatform) {
      setError(
        "Could not detect platform. Please use a TikTok, YouTube, or Instagram URL."
      );
      return;
    }

    // Check if platform is allowed for this campaign
    const campaign = approvedCampaigns.find((c) => c.id === selectedCampaign);
    if (
      campaign &&
      !campaign.requirements.platforms.includes(detectedPlatform as any)
    ) {
      setError(
        `This campaign only accepts posts from: ${campaign.requirements.platforms.join(", ")}`
      );
      return;
    }

    setSubmitting(true);

    try {
      // Note: status and submitted_at have defaults in the database
      const postData = {
        campaign_id: selectedCampaign,
        creator_id: profile.id,
        platform: detectedPlatform,
        post_url: postUrl.trim(),
        title: postTitle.trim() || null,
      };

      console.log("Submitting post:", postData);

      const { data, error: insertError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      console.log("Insert result:", { data, error: insertError });

      if (insertError) {
        console.error("Insert error details:", insertError);
        throw new Error(insertError.message || "Failed to save post to database");
      }

      setSubmitting(false);
      setSuccess(true);
    } catch (err: any) {
      console.error("Error submitting post:", err);
      setError(err.message || "Failed to submit post. Please try again.");
      setSubmitting(false);
    }
  };

  const selectedCampaignData = approvedCampaigns.find(
    (c) => c.id === selectedCampaign
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Post Submitted!</h2>
        <p className="text-muted-foreground mb-6">
          Your post has been submitted for review. You'll be notified once the
          brand approves it and tracking begins.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => router.push("/posts")}>
            View My Posts
          </Button>
          <Button onClick={() => {
            setSuccess(false);
            setPostUrl("");
            setPostTitle("");
            setDetectedPlatform(null);
          }}>
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  if (approvedCampaigns.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Approved Campaigns</h2>
        <p className="text-muted-foreground mb-6">
          You need to be approved for a campaign before you can submit posts.
          Browse available campaigns and apply to get started.
        </p>
        <Link href="/campaigns">
          <Button>Browse Campaigns</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Submit Post</h1>
        <p className="text-muted-foreground mt-1">
          Submit your content for tracking and earnings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {/* Campaign Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Campaign</CardTitle>
            <CardDescription>
              Choose which campaign this post is for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedCampaign === campaign.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedCampaign(campaign.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{campaign.title}</h4>
                    <div className="flex gap-1 mt-1">
                      {campaign.requirements.platforms.map((platform) => (
                        <Badge key={platform} variant="secondary" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-primary">
                      {formatCurrency(campaign.payout_rate.per_view)}/view
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Post Details */}
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>
              Enter the URL of your published post
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postUrl">Post URL *</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="postUrl"
                  type="url"
                  placeholder="https://tiktok.com/@username/video/..."
                  value={postUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              {detectedPlatform && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Detected platform: <span className="capitalize font-medium">{detectedPlatform}</span>
                </div>
              )}
              {postUrl && !detectedPlatform && (
                <p className="text-sm text-destructive">
                  Could not detect platform. Use a TikTok, YouTube, or Instagram URL.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postTitle">Post Title (optional)</Label>
              <Input
                id="postTitle"
                placeholder="Give your post a title for easy reference"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Campaign Requirements Reminder */}
        {selectedCampaignData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedCampaignData.requirements.hashtags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Required Hashtags: </span>
                  {selectedCampaignData.requirements.hashtags.map((tag) => (
                    <Badge key={tag} variant="outline" className="mr-1">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
              {selectedCampaignData.requirements.mentions.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Required Mentions: </span>
                  {selectedCampaignData.requirements.mentions.map((mention) => (
                    <Badge key={mention} variant="outline" className="mr-1">
                      @{mention}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Payout Rates: </span>
                <span>
                  {formatCurrency(selectedCampaignData.payout_rate.per_view)}/view,{" "}
                  {formatCurrency(selectedCampaignData.payout_rate.per_like)}/like,{" "}
                  {formatCurrency(selectedCampaignData.payout_rate.per_comment)}/comment,{" "}
                  {formatCurrency(selectedCampaignData.payout_rate.per_share)}/share
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedCampaign || !postUrl || !detectedPlatform}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Post
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function SubmitPostPage() {
  return (
    <AuthGuard allowedUserTypes={["creator"]}>
      <DashboardLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <SubmitPostForm />
        </Suspense>
      </DashboardLayout>
    </AuthGuard>
  );
}
