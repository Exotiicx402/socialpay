"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Campaign, PlatformType } from "@/types/database";
import {
  Search,
  Filter,
  PlusCircle,
  DollarSign,
  Users,
  Calendar,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface Filters {
  platforms: PlatformType[];
  minBudget: string;
  maxFollowers: string;
  sortBy: "newest" | "budget_high" | "budget_low" | "payout_high";
}

export default function CampaignsPage() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    platforms: [],
    minBudget: "",
    maxFollowers: "",
    sortBy: "newest",
  });

  const isBrand = profile?.user_type === "brand";

  const activeFilterCount = [
    filters.platforms.length > 0,
    filters.minBudget !== "",
    filters.maxFollowers !== "",
    filters.sortBy !== "newest",
  ].filter(Boolean).length;

  useEffect(() => {
    fetchCampaigns();
  }, [profile]);

  const fetchCampaigns = async () => {
    try {
      let query = supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (isBrand) {
        // Brands see their own campaigns
        query = query.eq("brand_id", profile?.id);
      } else {
        // Creators see all active campaigns
        query = query.eq("status", "active");
      }

      const { data, error } = await query;

      if (error) throw error;
      setCampaigns((data as Campaign[]) || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns
    .filter((campaign) => {
      // Text search
      const matchesSearch =
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Platform filter
      const matchesPlatform =
        filters.platforms.length === 0 ||
        filters.platforms.some((p) =>
          campaign.requirements.platforms.includes(p)
        );

      // Budget filter
      const matchesBudget =
        filters.minBudget === "" ||
        campaign.budget >= parseInt(filters.minBudget);

      // Max followers filter (campaigns that require <= user's max followers preference)
      const matchesFollowers =
        filters.maxFollowers === "" ||
        campaign.requirements.min_followers <= parseInt(filters.maxFollowers);

      return matchesSearch && matchesPlatform && matchesBudget && matchesFollowers;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "budget_high":
          return b.budget - a.budget;
        case "budget_low":
          return a.budget - b.budget;
        case "payout_high":
          return b.payout_rate.per_view - a.payout_rate.per_view;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const handlePlatformToggle = (platform: PlatformType) => {
    setFilters((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const clearFilters = () => {
    setFilters({
      platforms: [],
      minBudget: "",
      maxFollowers: "",
      sortBy: "newest",
    });
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

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      tiktok: "bg-black text-white",
      youtube: "bg-red-500 text-white",
      instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          colors[platform] || "bg-gray-500 text-white"
        }`}
      >
        {platform}
      </span>
    );
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                {isBrand ? "My Campaigns" : "Browse Campaigns"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isBrand
                  ? "Manage your influencer marketing campaigns"
                  : "Find campaigns that match your content style"}
              </p>
            </div>
            {isBrand && (
              <Link href="/campaigns/new">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Campaign
                </Button>
              </Link>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Campaigns</SheetTitle>
                  <SheetDescription>
                    Narrow down campaigns to find the perfect match
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: Filters["sortBy"]) =>
                        setFilters((prev) => ({ ...prev, sortBy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="budget_high">Highest Budget</SelectItem>
                        <SelectItem value="budget_low">Lowest Budget</SelectItem>
                        <SelectItem value="payout_high">Highest Payout Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Platforms */}
                  <div className="space-y-3">
                    <Label>Platforms</Label>
                    <div className="space-y-2">
                      {(["tiktok", "youtube", "instagram"] as PlatformType[]).map(
                        (platform) => (
                          <div
                            key={platform}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`platform-${platform}`}
                              checked={filters.platforms.includes(platform)}
                              onCheckedChange={() => handlePlatformToggle(platform)}
                            />
                            <label
                              htmlFor={`platform-${platform}`}
                              className="text-sm font-medium capitalize cursor-pointer"
                            >
                              {platform}
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Min Budget */}
                  <div className="space-y-2">
                    <Label htmlFor="minBudget">Minimum Budget ($)</Label>
                    <Input
                      id="minBudget"
                      type="number"
                      placeholder="e.g., 500"
                      value={filters.minBudget}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, minBudget: e.target.value }))
                      }
                    />
                  </div>

                  {/* Max Followers Required */}
                  <div className="space-y-2">
                    <Label htmlFor="maxFollowers">Max Followers Required</Label>
                    <Input
                      id="maxFollowers"
                      type="number"
                      placeholder="e.g., 10000"
                      value={filters.maxFollowers}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxFollowers: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Show campaigns requiring up to this many followers
                    </p>
                  </div>
                </div>

                <SheetFooter className="flex gap-2">
                  <Button variant="outline" onClick={clearFilters} className="flex-1">
                    Clear All
                  </Button>
                  <Button onClick={() => setShowFilters(false)} className="flex-1">
                    Apply Filters
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.platforms.map((platform) => (
                <Badge
                  key={platform}
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => handlePlatformToggle(platform)}
                >
                  {platform}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {filters.minBudget && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => setFilters((prev) => ({ ...prev, minBudget: "" }))}
                >
                  Min ${filters.minBudget}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.maxFollowers && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => setFilters((prev) => ({ ...prev, maxFollowers: "" }))}
                >
                  Max {parseInt(filters.maxFollowers).toLocaleString()} followers
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.sortBy !== "newest" && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => setFilters((prev) => ({ ...prev, sortBy: "newest" }))}
                >
                  {filters.sortBy === "budget_high"
                    ? "Highest Budget"
                    : filters.sortBy === "budget_low"
                    ? "Lowest Budget"
                    : "Highest Payout"}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Campaign Grid */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-40 bg-muted animate-pulse rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">
                          {campaign.title}
                        </CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {campaign.description}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {campaign.requirements.platforms.map((platform) => (
                          <span key={platform}>
                            {getPlatformBadge(platform)}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {formatCurrency(campaign.payout_rate.per_view)}/view
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>
                            {campaign.requirements.min_followers.toLocaleString()}+
                            followers
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-primary">
                          {formatCurrency(campaign.budget)} budget
                        </span>
                        {campaign.expires_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Ends {formatDate(campaign.expires_at)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No campaigns match your search."
                    : isBrand
                    ? "You haven't created any campaigns yet."
                    : "No active campaigns available."}
                </p>
                {isBrand && !searchQuery && (
                  <Link href="/campaigns/new">
                    <Button className="mt-4 gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Create Your First Campaign
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
