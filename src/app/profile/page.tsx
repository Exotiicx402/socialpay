"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { CreatorProfile, BrandProfile } from "@/types/database";
import { Loader2, Save, User, Building2, DollarSign, TrendingUp } from "lucide-react";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    bio: "",
    website: "",
    tiktokUsername: "",
    tiktokFollowers: "",
    youtubeChannel: "",
    youtubeSubscribers: "",
    instagramUsername: "",
    instagramFollowers: "",
    industry: "",
    companySize: "",
    categories: [] as string[],
  });

  const [extendedProfile, setExtendedProfile] = useState<
    CreatorProfile | BrandProfile | null
  >(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        companyName: profile.company_name || "",
        bio: profile.bio || "",
        website: profile.website || "",
        tiktokUsername: "",
        youtubeChannel: "",
        instagramUsername: "",
      });
      fetchExtendedProfile();
    }
  }, [profile]);

  const fetchExtendedProfile = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      if (profile.user_type === "creator") {
        const { data } = await supabase
          .from("creator_profiles")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (data) {
          const creatorData = data as CreatorProfile;
          setExtendedProfile(creatorData);
          setFormData((prev) => ({
            ...prev,
            tiktokUsername: creatorData.tiktok_username || "",
            tiktokFollowers: creatorData.tiktok_followers?.toString() || "",
            youtubeChannel: creatorData.youtube_channel || "",
            youtubeSubscribers: creatorData.youtube_subscribers?.toString() || "",
            instagramUsername: creatorData.instagram_username || "",
            instagramFollowers: creatorData.instagram_followers?.toString() || "",
            categories: creatorData.categories || [],
          }));
        }
      } else {
        const { data } = await supabase
          .from("brand_profiles")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (data) {
          const brandData = data as BrandProfile;
          setExtendedProfile(brandData);
          setFormData((prev) => ({
            ...prev,
            industry: brandData.industry || "",
            companySize: brandData.company_size || "",
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching extended profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      // Update user profile
      await supabase
        .from("users")
        .update({
          full_name: formData.fullName,
          company_name: formData.companyName || null,
          bio: formData.bio || null,
          website: formData.website || null,
        })
        .eq("id", profile?.id);

      // Update extended profile
      if (profile?.user_type === "creator") {
        await supabase
          .from("creator_profiles")
          .update({
            tiktok_username: formData.tiktokUsername || null,
            tiktok_followers: formData.tiktokFollowers ? parseInt(formData.tiktokFollowers) : 0,
            youtube_channel: formData.youtubeChannel || null,
            youtube_subscribers: formData.youtubeSubscribers ? parseInt(formData.youtubeSubscribers) : 0,
            instagram_username: formData.instagramUsername || null,
            instagram_followers: formData.instagramFollowers ? parseInt(formData.instagramFollowers) : 0,
            categories: formData.categories,
          })
          .eq("user_id", profile.id);
      } else if (profile?.user_type === "brand") {
        await supabase
          .from("brand_profiles")
          .update({
            industry: formData.industry || null,
            company_size: formData.companySize || null,
          })
          .eq("user_id", profile.id);
      }

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account information
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="p-4 rounded-lg bg-green-500/10 text-green-600">
                  Profile updated successfully!
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {profile?.user_type === "brand" && (
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            companyName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Tell us about yourself..."
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, bio: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://example.com"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {profile?.user_type === "creator" && (
                <>
                  {/* Stats Card */}
                  {extendedProfile && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Your Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency((extendedProfile as CreatorProfile).total_earnings || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Earnings</div>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-amber-500">
                              {formatCurrency((extendedProfile as CreatorProfile).pending_earnings || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Pending Payout</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Social Media Accounts</CardTitle>
                      <CardDescription>
                        Connect your social accounts to qualify for campaigns
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* TikTok */}
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-black flex items-center justify-center text-white text-xs font-bold">
                            TT
                          </div>
                          <span className="font-medium">TikTok</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="tiktok">Username</Label>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                                @
                              </span>
                              <Input
                                id="tiktok"
                                className="rounded-l-none"
                                placeholder="username"
                                value={formData.tiktokUsername}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    tiktokUsername: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tiktokFollowers">Followers</Label>
                            <Input
                              id="tiktokFollowers"
                              type="number"
                              placeholder="e.g., 10000"
                              value={formData.tiktokFollowers}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tiktokFollowers: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* YouTube */}
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                            YT
                          </div>
                          <span className="font-medium">YouTube</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="youtube">Channel URL or Handle</Label>
                            <Input
                              id="youtube"
                              placeholder="@channel or URL"
                              value={formData.youtubeChannel}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  youtubeChannel: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="youtubeSubscribers">Subscribers</Label>
                            <Input
                              id="youtubeSubscribers"
                              type="number"
                              placeholder="e.g., 50000"
                              value={formData.youtubeSubscribers}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  youtubeSubscribers: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Instagram */}
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            IG
                          </div>
                          <span className="font-medium">Instagram</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="instagram">Username</Label>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                                @
                              </span>
                              <Input
                                id="instagram"
                                className="rounded-l-none"
                                placeholder="username"
                                value={formData.instagramUsername}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    instagramUsername: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="instagramFollowers">Followers</Label>
                            <Input
                              id="instagramFollowers"
                              type="number"
                              placeholder="e.g., 25000"
                              value={formData.instagramFollowers}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  instagramFollowers: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {profile?.user_type === "brand" && (
                <>
                  {/* Stats Card */}
                  {extendedProfile && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Campaign Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {(extendedProfile as BrandProfile).active_campaigns || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Active Campaigns</div>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold">
                              {formatCurrency((extendedProfile as BrandProfile).total_spent || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Spent</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Company Information</CardTitle>
                      <CardDescription>
                        Help creators learn more about your brand
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select
                          value={formData.industry}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, industry: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="fashion">Fashion & Apparel</SelectItem>
                            <SelectItem value="beauty">Beauty & Cosmetics</SelectItem>
                            <SelectItem value="food">Food & Beverage</SelectItem>
                            <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                            <SelectItem value="gaming">Gaming</SelectItem>
                            <SelectItem value="entertainment">Entertainment</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="travel">Travel & Hospitality</SelectItem>
                            <SelectItem value="ecommerce">E-Commerce</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companySize">Company Size</Label>
                        <Select
                          value={formData.companySize}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, companySize: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">11-50 employees</SelectItem>
                            <SelectItem value="51-200">51-200 employees</SelectItem>
                            <SelectItem value="201-500">201-500 employees</SelectItem>
                            <SelectItem value="501-1000">501-1000 employees</SelectItem>
                            <SelectItem value="1000+">1000+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </form>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
