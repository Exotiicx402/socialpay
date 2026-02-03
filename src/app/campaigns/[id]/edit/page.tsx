"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types/database";
import { ArrowLeft, Loader2, X, Plus, Trash2 } from "lucide-react";

const PLATFORMS = ["tiktok", "youtube", "instagram"] as const;
const CONTENT_TYPES = ["video", "short", "reel", "story", "post"] as const;
const STATUSES = ["active", "paused", "completed", "pending_funding"] as const;

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    status: "active" as "active" | "paused" | "completed" | "pending_funding",
    platforms: [] as string[],
    minFollowers: "1000",
    contentTypes: [] as string[],
    hashtags: [] as string[],
    mentions: [] as string[],
    perView: "0.01",
    perLike: "0.05",
    perComment: "0.10",
    perShare: "0.15",
    maxCreators: "",
    expiresAt: "",
  });

  const [newHashtag, setNewHashtag] = useState("");
  const [newMention, setNewMention] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;

      const campaignData = data as Campaign;
      setCampaign(campaignData);

      // Check if user owns this campaign
      if (campaignData.brand_id !== profile?.id) {
        router.push("/campaigns");
        return;
      }

      // Populate form
      setFormData({
        title: campaignData.title,
        description: campaignData.description,
        budget: campaignData.budget.toString(),
        status: campaignData.status,
        platforms: campaignData.requirements.platforms || [],
        minFollowers: (campaignData.requirements.min_followers || 0).toString(),
        contentTypes: campaignData.requirements.content_type || [],
        hashtags: campaignData.requirements.hashtags || [],
        mentions: campaignData.requirements.mentions || [],
        perView: campaignData.payout_rate.per_view.toString(),
        perLike: campaignData.payout_rate.per_like.toString(),
        perComment: campaignData.payout_rate.per_comment.toString(),
        perShare: campaignData.payout_rate.per_share.toString(),
        maxCreators: campaignData.max_creators?.toString() || "",
        expiresAt: campaignData.expires_at
          ? new Date(campaignData.expires_at).toISOString().split("T")[0]
          : "",
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleContentType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter((t) => t !== type)
        : [...prev.contentTypes, type],
    }));
  };

  const addHashtag = () => {
    if (newHashtag && !formData.hashtags.includes(newHashtag)) {
      setFormData((prev) => ({
        ...prev,
        hashtags: [...prev.hashtags, newHashtag.replace("#", "")],
      }));
      setNewHashtag("");
    }
  };

  const removeHashtag = (hashtag: string) => {
    setFormData((prev) => ({
      ...prev,
      hashtags: prev.hashtags.filter((h) => h !== hashtag),
    }));
  };

  const addMention = () => {
    if (newMention && !formData.mentions.includes(newMention)) {
      setFormData((prev) => ({
        ...prev,
        mentions: [...prev.mentions, newMention.replace("@", "")],
      }));
      setNewMention("");
    }
  };

  const removeMention = (mention: string) => {
    setFormData((prev) => ({
      ...prev,
      mentions: prev.mentions.filter((m) => m !== mention),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Campaign title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Campaign description is required");
      return;
    }
    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      setError("Please enter a valid budget");
      return;
    }
    if (formData.platforms.length === 0) {
      setError("Please select at least one platform");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          budget: parseFloat(formData.budget),
          status: formData.status,
          requirements: {
            platforms: formData.platforms,
            min_followers: parseInt(formData.minFollowers) || 0,
            content_type: formData.contentTypes,
            hashtags: formData.hashtags,
            mentions: formData.mentions,
          },
          payout_rate: {
            per_view: parseFloat(formData.perView) || 0.01,
            per_like: parseFloat(formData.perLike) || 0.05,
            per_comment: parseFloat(formData.perComment) || 0.1,
            per_share: parseFloat(formData.perShare) || 0.15,
          },
          max_creators: formData.maxCreators
            ? parseInt(formData.maxCreators)
            : null,
          expires_at: formData.expiresAt || null,
        })
        .eq("id", params.id);

      if (updateError) throw updateError;

      router.push(`/campaigns/${params.id}`);
    } catch (err: any) {
      console.error("Error updating campaign:", err);
      setError(err.message || "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      const { error: deleteError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", params.id);

      if (deleteError) throw deleteError;

      router.push("/campaigns");
    } catch (err: any) {
      console.error("Error deleting campaign:", err);
      setError(err.message || "Failed to delete campaign");
    } finally {
      setDeleting(false);
    }
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
            <p className="text-muted-foreground mb-4">
              This campaign may have been removed or you don't have permission to edit it.
            </p>
            <Button onClick={() => router.push("/campaigns")}>
              Back to Campaigns
            </Button>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedUserTypes={["brand"]}>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Campaign</h1>
              <p className="text-muted-foreground mt-1">
                Update your campaign details
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Campaign
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Campaign Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Summer Product Launch"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe what you're looking for from creators..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex gap-2">
                    {STATUSES.map((status) => (
                      <Badge
                        key={status}
                        variant={formData.status === status ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, status }))
                        }
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Total Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="5000"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          budget: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCreators">Max Creators (optional)</Label>
                    <Input
                      id="maxCreators"
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={formData.maxCreators}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxCreators: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">End Date (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expiresAt: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                      <Badge
                        key={platform}
                        variant={
                          formData.platforms.includes(platform)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer capitalize"
                        onClick={() => togglePlatform(platform)}
                      >
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minFollowers">Minimum Followers</Label>
                  <Input
                    id="minFollowers"
                    type="number"
                    min="0"
                    value={formData.minFollowers}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minFollowers: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={
                          formData.contentTypes.includes(type)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer capitalize"
                        onClick={() => toggleContentType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Hashtags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add hashtag"
                      value={newHashtag}
                      onChange={(e) => setNewHashtag(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addHashtag())
                      }
                    />
                    <Button type="button" variant="outline" onClick={addHashtag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.hashtags.map((hashtag) => (
                      <Badge key={hashtag} variant="secondary" className="gap-1">
                        #{hashtag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeHashtag(hashtag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Mentions</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add mention"
                      value={newMention}
                      onChange={(e) => setNewMention(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addMention())
                      }
                    />
                    <Button type="button" variant="outline" onClick={addMention}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.mentions.map((mention) => (
                      <Badge key={mention} variant="secondary" className="gap-1">
                        @{mention}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeMention(mention)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Rates</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="perView">Per View ($)</Label>
                  <Input
                    id="perView"
                    type="number"
                    min="0"
                    step="0.001"
                    value={formData.perView}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        perView: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perLike">Per Like ($)</Label>
                  <Input
                    id="perLike"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.perLike}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        perLike: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perComment">Per Comment ($)</Label>
                  <Input
                    id="perComment"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.perComment}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        perComment: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perShare">Per Share ($)</Label>
                  <Input
                    id="perShare"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.perShare}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        perShare: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
