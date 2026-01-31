"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import type { Campaign, CampaignApplication, User, CreatorProfile } from "@/types/database";
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  User as UserIcon,
  ExternalLink,
  Clock,
} from "lucide-react";

interface ApplicationWithCreator extends CampaignApplication {
  creator?: User;
  creator_profile?: CreatorProfile;
}

export default function CampaignApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<ApplicationWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (params.id && profile) {
      fetchData();
    }
  }, [params.id, profile]);

  const fetchData = async () => {
    try {
      const campaignId = params.id as string;

      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;

      const camp = campaignData as Campaign;

      // Check ownership
      if (camp.brand_id !== profile?.id) {
        router.push("/campaigns");
        return;
      }

      setCampaign(camp);

      // Fetch applications
      const { data: applicationsData, error: appError } = await supabase
        .from("campaign_applications")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (appError) throw appError;

      const apps = applicationsData as CampaignApplication[];

      // Fetch creator details for each application
      if (apps && apps.length > 0) {
        const creatorIds = apps.map((a) => a.creator_id);

        const { data: creatorsData } = await supabase
          .from("users")
          .select("*")
          .in("id", creatorIds);

        const { data: profilesData } = await supabase
          .from("creator_profiles")
          .select("*")
          .in("user_id", creatorIds);

        const creators = creatorsData as User[] | null;
        const profiles = profilesData as CreatorProfile[] | null;

        const appsWithCreators = apps.map((app) => ({
          ...app,
          creator: creators?.find((c) => c.id === app.creator_id),
          creator_profile: profiles?.find((p) => p.user_id === app.creator_id),
        }));

        setApplications(appsWithCreators as ApplicationWithCreator[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    applicationId: string,
    status: "approved" | "rejected"
  ) => {
    setProcessingId(applicationId);

    try {
      const { error } = await supabase
        .from("campaign_applications")
        .update({ status })
        .eq("id", applicationId);

      if (error) throw error;

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status } : app
        )
      );
    } catch (error) {
      console.error("Error updating application:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
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

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <AuthGuard allowedUserTypes={["brand"]}>
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
      <AuthGuard allowedUserTypes={["brand"]}>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Campaign Not Found</h2>
            <Button onClick={() => router.push("/campaigns")}>
              Back to Campaigns
            </Button>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  const pendingApps = applications.filter((a) => a.status === "pending");
  const approvedApps = applications.filter((a) => a.status === "approved");
  const rejectedApps = applications.filter((a) => a.status === "rejected");

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaign
          </Button>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Applications</h1>
            <p className="text-muted-foreground mt-1">
              Review applications for <strong>{campaign.title}</strong>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingApps.length}
                </div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {approvedApps.length}
                </div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {rejectedApps.length}
                </div>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          {applications.length > 0 ? (
            <div className="space-y-4">
              {/* Pending Applications */}
              {pendingApps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      Pending Review ({pendingApps.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingApps.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-yellow-50/50"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={application.creator?.profile_image || undefined}
                            />
                            <AvatarFallback>
                              {getInitials(
                                application.creator?.full_name || "U"
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {application.creator?.full_name}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {application.creator_profile?.tiktok_username && (
                                <span>
                                  TikTok:{" "}
                                  {formatFollowers(
                                    application.creator_profile.tiktok_followers
                                  )}
                                </span>
                              )}
                              {application.creator_profile?.instagram_username && (
                                <span>
                                  IG:{" "}
                                  {formatFollowers(
                                    application.creator_profile.instagram_followers
                                  )}
                                </span>
                              )}
                              {application.creator_profile?.youtube_channel && (
                                <span>
                                  YT:{" "}
                                  {formatFollowers(
                                    application.creator_profile.youtube_subscribers
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Applied {formatDate(application.created_at)}
                            </p>
                            {application.message && (
                              <p className="text-sm mt-2 italic">
                                "{application.message}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              handleUpdateStatus(application.id, "rejected")
                            }
                            disabled={processingId === application.id}
                          >
                            {processingId === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              handleUpdateStatus(application.id, "approved")
                            }
                            disabled={processingId === application.id}
                          >
                            {processingId === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Approved Applications */}
              {approvedApps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      Approved ({approvedApps.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {approvedApps.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-green-50/50"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={application.creator?.profile_image || undefined}
                            />
                            <AvatarFallback>
                              {getInitials(
                                application.creator?.full_name || "U"
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {application.creator?.full_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Approved {formatDate(application.updated_at)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(application.status)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Rejected Applications */}
              {rejectedApps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <X className="h-5 w-5 text-red-600" />
                      Rejected ({rejectedApps.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {rejectedApps.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-red-50/30 opacity-60"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={application.creator?.profile_image || undefined}
                            />
                            <AvatarFallback>
                              {getInitials(
                                application.creator?.full_name || "U"
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {application.creator?.full_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Rejected {formatDate(application.updated_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(application.id, "approved")
                          }
                          disabled={processingId === application.id}
                        >
                          {processingId === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Reconsider"
                          )}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UserIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  No applications yet for this campaign.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Applications will appear here when creators apply.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
