"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Campaign, User, CampaignApplication } from "@/types/database";
import {
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  XCircle,
  AlertCircle,
  Send,
} from "lucide-react";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [brand, setBrand] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [application, setApplication] = useState<CampaignApplication | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const isBrand = profile?.user_type === "brand";
  const isOwner = isBrand && campaign?.brand_id === profile?.id;

  useEffect(() => {
    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      const { data: campaignData, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setCampaign(campaignData as Campaign);

      // Fetch brand info
      if (campaignData) {
        const { data: brandData } = await supabase
          .from("users")
          .select("*")
          .eq("id", campaignData.brand_id)
          .single();

        if (brandData) {
          setBrand(brandData as User);
        }
      }

      // Check if creator has already applied
      if (profile && profile.user_type === "creator") {
        const { data: applicationData } = await supabase
          .from("campaign_applications")
          .select("*")
          .eq("campaign_id", params.id)
          .eq("creator_id", profile.id)
          .single();

        if (applicationData) {
          setApplication(applicationData as CampaignApplication);
        }
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!profile || application) return;

    setApplying(true);
    try {
      const { data, error } = await supabase
        .from("campaign_applications")
        .insert({
          campaign_id: campaign?.id,
          creator_id: profile.id,
          status: "pending",
          message: applicationMessage || null,
        })
        .select()
        .single();

      if (error) throw error;
      setApplication(data as CampaignApplication);
      setShowApplyDialog(false);
      setApplicationMessage("");
    } catch (error) {
      console.error("Error applying to campaign:", error);
    } finally {
      setApplying(false);
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="mr-1 h-3 w-3" />
            Pending Review
          </Badge>
        );
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

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!campaign) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Campaign Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This campaign may have been removed or doesn't exist.
            </p>
            <Link href="/campaigns">
              <Button>Browse Campaigns</Button>
            </Link>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Header */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-4">
                <h1 className="text-3xl font-bold">{campaign.title}</h1>
                {getStatusBadge(campaign.status)}
              </div>
              <p className="text-muted-foreground mb-4">
                {campaign.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  By{" "}
                  <span className="font-medium text-foreground">
                    {brand?.company_name || brand?.full_name}
                  </span>
                </span>
                <span>Created {formatDate(campaign.created_at)}</span>
              </div>
            </div>

            {/* Action Card */}
            {!isBrand && (
              <Card className="lg:w-80">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(campaign.budget)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Budget
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per View</span>
                      <span className="font-medium">
                        {formatCurrency(campaign.payout_rate.per_view)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per Like</span>
                      <span className="font-medium">
                        {formatCurrency(campaign.payout_rate.per_like)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per Comment</span>
                      <span className="font-medium">
                        {formatCurrency(campaign.payout_rate.per_comment)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per Share</span>
                      <span className="font-medium">
                        {formatCurrency(campaign.payout_rate.per_share)}
                      </span>
                    </div>
                  </div>
                  {application ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center">
                        {getApplicationStatusBadge(application.status)}
                      </div>
                      {application.status === "approved" && (
                        <Link href={`/posts/new?campaign=${campaign.id}`}>
                          <Button className="w-full">
                            <Send className="mr-2 h-4 w-4" />
                            Submit Post
                          </Button>
                        </Link>
                      )}
                      {application.status === "pending" && (
                        <p className="text-xs text-center text-muted-foreground">
                          Your application is being reviewed by the brand.
                        </p>
                      )}
                      {application.status === "rejected" && (
                        <p className="text-xs text-center text-muted-foreground">
                          Unfortunately, your application was not accepted for this campaign.
                        </p>
                      )}
                    </div>
                  ) : campaign.status === "active" ? (
                    <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full">Apply to Campaign</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Apply to Campaign</DialogTitle>
                          <DialogDescription>
                            Tell the brand why you'd be a great fit for this campaign.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="message">Message (Optional)</Label>
                            <Textarea
                              id="message"
                              placeholder="Introduce yourself and explain why you're interested in this campaign..."
                              value={applicationMessage}
                              onChange={(e) => setApplicationMessage(e.target.value)}
                              rows={4}
                            />
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <h4 className="font-medium mb-1">Campaign Requirements:</h4>
                            <ul className="text-muted-foreground space-y-1">
                              <li>• {campaign.requirements.min_followers.toLocaleString()}+ followers required</li>
                              <li>• Platforms: {campaign.requirements.platforms.join(", ")}</li>
                            </ul>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleApply} disabled={applying}>
                            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Application
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button className="w-full" disabled>
                      Campaign Not Active
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {isOwner && (
              <Card className="lg:w-80">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {formatCurrency(campaign.spent)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of {formatCurrency(campaign.budget)} spent
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
                  <Separator />
                  <div className="space-y-2">
                    <Link href={`/campaigns/${campaign.id}/edit`}>
                      <Button variant="outline" className="w-full">
                        Edit Campaign
                      </Button>
                    </Link>
                    <Link href={`/campaigns/${campaign.id}/applications`}>
                      <Button className="w-full">View Applications</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Platforms</h4>
                  <div className="flex flex-wrap gap-2">
                    {campaign.requirements.platforms.map((platform) => (
                      <Badge key={platform} variant="secondary">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Minimum Followers
                  </h4>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {campaign.requirements.min_followers.toLocaleString()}+
                    followers
                  </div>
                </div>

                {campaign.requirements.content_type.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Content Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {campaign.requirements.content_type.map((type) => (
                        <Badge key={type} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {campaign.requirements.hashtags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Required Hashtags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {campaign.requirements.hashtags.map((hashtag) => (
                        <Badge key={hashtag} variant="outline">
                          #{hashtag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {campaign.requirements.mentions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Required Mentions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {campaign.requirements.mentions.map((mention) => (
                        <Badge key={mention} variant="outline">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <span>Per View</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(campaign.payout_rate.per_view)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-muted-foreground" />
                      <span>Per Like</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(campaign.payout_rate.per_like)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      <span>Per Comment</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(campaign.payout_rate.per_comment)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Share2 className="h-5 w-5 text-muted-foreground" />
                      <span>Per Share</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(campaign.payout_rate.per_share)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Started</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(campaign.starts_at)}
                    </div>
                  </div>
                </div>
                {campaign.expires_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Ends</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(campaign.expires_at)}
                      </div>
                    </div>
                  </div>
                )}
                {campaign.max_creators && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Max Creators</div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.max_creators} spots available
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* About the Brand */}
            <Card>
              <CardHeader>
                <CardTitle>About the Brand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {(brand?.company_name || brand?.full_name || "B")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {brand?.company_name || brand?.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {brand?.bio || "No description available"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
