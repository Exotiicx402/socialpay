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
import type { Campaign, CampaignApplication, User, CreatorProfile } from "@/types/database";
import {
  Users,
  Check,
  X,
  Clock,
  Filter,
  Loader2,
  ExternalLink,
  MessageSquare,
  TrendingUp,
  Instagram,
  Youtube,
  Eye,
  AlertCircle,
} from "lucide-react";

interface ApplicationWithDetails extends CampaignApplication {
  campaign?: Campaign;
  creator?: User;
  creator_profile?: CreatorProfile;
}

export default function ApplicationsPage() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

        // Fetch applications for all campaigns
        const campaignIds = campaignsData.map((c) => c.id);
        if (campaignIds.length > 0) {
          const { data: applicationsData } = await supabase
            .from("campaign_applications")
            .select("*")
            .in("campaign_id", campaignIds)
            .order("created_at", { ascending: false });

          if (applicationsData) {
            // Fetch creator details for each application
            const creatorIds = [...new Set(applicationsData.map((a) => a.creator_id))];

            const { data: creatorsData } = await supabase
              .from("users")
              .select("*")
              .in("id", creatorIds);

            const { data: creatorProfilesData } = await supabase
              .from("creator_profiles")
              .select("*")
              .in("user_id", creatorIds);

            // Combine all data
            const applicationsWithDetails = applicationsData.map((app) => ({
              ...app,
              campaign: campaignsData.find((c) => c.id === app.campaign_id),
              creator: creatorsData?.find((u) => u.id === app.creator_id),
              creator_profile: creatorProfilesData?.find((p) => p.user_id === app.creator_id),
            }));

            setApplications(applicationsWithDetails as ApplicationWithDetails[]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: ApplicationWithDetails) => {
    setActionLoading(application.id);

    try {
      const { error } = await supabase
        .from("campaign_applications")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", application.id);

      if (error) throw error;

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === application.id ? { ...app, status: "approved" } : app
        )
      );
    } catch (error) {
      console.error("Error approving application:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (application: ApplicationWithDetails) => {
    setSelectedApplication(application);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    setActionLoading(selectedApplication.id);

    try {
      const { error } = await supabase
        .from("campaign_applications")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
          message: rejectionReason || null,
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApplication.id ? { ...app, status: "rejected" } : app
        )
      );

      setRejectDialogOpen(false);
      setSelectedApplication(null);
    } catch (error) {
      console.error("Error rejecting application:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (selectedCampaign !== "all" && app.campaign_id !== selectedCampaign) {
      return false;
    }
    if (statusFilter !== "all" && app.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Applications</h1>
              <p className="text-muted-foreground mt-1">
                Review and manage creator applications for your campaigns.
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Filter by Campaign
                  </Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="All campaigns" />
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
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Filter by Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No applications found</h3>
                <p className="text-muted-foreground">
                  {applications.length === 0
                    ? "You haven't received any applications yet."
                    : "No applications match your current filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <Card key={application.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Creator Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-14 w-14">
                          <AvatarImage
                            src={application.creator?.profile_image || undefined}
                            alt={application.creator?.full_name}
                          />
                          <AvatarFallback className="text-lg">
                            {getInitials(application.creator?.full_name || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {application.creator?.full_name}
                            </h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Applied to <span className="font-medium text-foreground">{application.campaign?.title}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(application.created_at)}
                          </p>

                          {/* Creator Stats */}
                          <div className="flex flex-wrap items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-sm">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatNumber(getTotalFollowers(application.creator_profile))}
                              </span>
                              <span className="text-muted-foreground">total followers</span>
                            </div>

                            {application.creator_profile?.tiktok_followers ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span className="font-bold">TT</span>
                                {formatNumber(application.creator_profile.tiktok_followers)}
                              </div>
                            ) : null}

                            {application.creator_profile?.youtube_subscribers ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Youtube className="h-4 w-4" />
                                {formatNumber(application.creator_profile.youtube_subscribers)}
                              </div>
                            ) : null}

                            {application.creator_profile?.instagram_followers ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Instagram className="h-4 w-4" />
                                {formatNumber(application.creator_profile.instagram_followers)}
                              </div>
                            ) : null}
                          </div>

                          {/* Application Message */}
                          {application.message && (
                            <div className="mt-4 p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <MessageSquare className="h-4 w-4" />
                                Application Message
                              </div>
                              <p className="text-sm">{application.message}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:w-40">
                        {application.status === "pending" ? (
                          <>
                            <Button
                              onClick={() => handleApprove(application)}
                              disabled={actionLoading === application.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {actionLoading === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => openRejectDialog(application)}
                              disabled={actionLoading === application.id}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <div className="text-center lg:text-right">
                            <p className="text-sm text-muted-foreground">
                              {application.status === "approved"
                                ? "Creator can now submit posts"
                                : "Application was rejected"}
                            </p>
                          </div>
                        )}
                        <Link href={`/campaigns/${application.campaign_id}`}>
                          <Button variant="outline" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            View Campaign
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject {selectedApplication?.creator?.full_name}'s application?
                You can optionally provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Reason (optional)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Let the creator know why their application wasn't accepted..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading === selectedApplication?.id}
              >
                {actionLoading === selectedApplication?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AuthGuard>
  );
}
