"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, X, Plus } from "lucide-react";

const PLATFORMS = ["tiktok", "youtube", "instagram"] as const;
const CONTENT_TYPES = ["video", "short", "reel", "story", "post"] as const;

export default function NewCampaignPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
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

    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          brand_id: profile?.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          budget: parseFloat(formData.budget),
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
            per_comment: parseFloat(formData.perComment) || 0.10,
            per_share: parseFloat(formData.perShare) || 0.15,
          },
          max_creators: formData.maxCreators
            ? parseInt(formData.maxCreators)
            : null,
          expires_at: formData.expiresAt || null,
          status: "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/campaigns/${data.id}`);
    } catch (err: any) {
      console.error("Error creating campaign:", err);
      setError(err.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

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

          <div>
            <h1 className="text-3xl font-bold">Create New Campaign</h1>
            <p className="text-muted-foreground mt-1">
              Set up your influencer marketing campaign
            </p>
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
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
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
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMention())}
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
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Campaign
              </Button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
