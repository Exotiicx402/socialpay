export type UserType = "creator" | "brand";
export type CampaignStatus = "active" | "paused" | "completed" | "pending_funding";
export type PayoutModel = "base_performance" | "performance_only" | "fixed";
export type CreatorNiche = "gaming" | "beauty" | "tech" | "food" | "fitness" | "fashion" | "travel" | "lifestyle" | "comedy" | "education" | "music" | "other";
export type PlatformType = "tiktok" | "youtube" | "instagram";
export type PostStatus = "pending" | "approved" | "tracking" | "completed" | "rejected";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  full_name: string;
  company_name?: string | null;
  company_id?: string | null;
  profile_image?: string | null;
  bio?: string | null;
  website?: string | null;
  social_links?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  website?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  requirements: {
    platforms: PlatformType[];
    min_followers: number;
    content_type: string[];
    hashtags: string[];
    mentions: string[];
  };
  payout_rate: {
    per_view: number;
    per_like: number;
    per_comment: number;
    per_share: number;
  };
  budget: number;
  spent: number;
  status: CampaignStatus;
  max_creators?: number | null;
  created_at: string;
  updated_at: string;
  starts_at: string;
  expires_at?: string | null;
  // Enhanced campaign fields
  brief_description?: string | null;
  key_talking_points?: string[] | null;
  dos?: string[] | null;
  donts?: string[] | null;
  call_to_action?: string | null;
  target_niche?: CreatorNiche | null;
  min_follower_count?: number;
  max_follower_count?: number | null;
  payout_model?: PayoutModel;
  payout_base_rate_cents?: number;
  payout_performance_rate_cents?: number;
  payout_max_per_creator_cents?: number | null;
  total_budget_cents?: number | null;
  campaign_images?: string[] | null;
}

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: ApplicationStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: PlatformType;
  post_url: string;
  post_id?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  status: PostStatus;
  submitted_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  rejection_reason?: string | null;
}

export interface PostMetrics {
  id: string;
  post_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  earnings: number;
  fetched_at: string;
}

export interface Payout {
  id: string;
  creator_id: string;
  post_id?: string | null;
  campaign_id?: string | null;
  amount: number;
  status: PayoutStatus;
  payment_method?: string | null;
  payment_details?: Record<string, unknown>;
  notes?: string | null;
  created_at: string;
  processed_at?: string | null;
  paid_at?: string | null;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  tiktok_username?: string | null;
  tiktok_followers: number;
  youtube_channel?: string | null;
  youtube_subscribers: number;
  instagram_username?: string | null;
  instagram_followers: number;
  total_earnings: number;
  pending_earnings: number;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export interface BrandProfile {
  id: string;
  user_id: string;
  company_size?: string | null;
  industry?: string | null;
  total_spent: number;
  active_campaigns: number;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | "application_approved"
  | "application_rejected"
  | "new_application"
  | "post_approved"
  | "post_rejected"
  | "payout_completed"
  | "campaign_update";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "updated_at">;
        Update: Partial<Omit<User, "id" | "created_at">>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, "id" | "created_at" | "updated_at" | "spent">;
        Update: Partial<Omit<Campaign, "id" | "created_at">>;
      };
      campaign_applications: {
        Row: CampaignApplication;
        Insert: Omit<CampaignApplication, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CampaignApplication, "id" | "created_at">>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, "id" | "submitted_at">;
        Update: Partial<Omit<Post, "id" | "submitted_at">>;
      };
      post_metrics: {
        Row: PostMetrics;
        Insert: Omit<PostMetrics, "id" | "fetched_at">;
        Update: Partial<Omit<PostMetrics, "id">>;
      };
      payouts: {
        Row: Payout;
        Insert: Omit<Payout, "id" | "created_at">;
        Update: Partial<Omit<Payout, "id" | "created_at">>;
      };
      creator_profiles: {
        Row: CreatorProfile;
        Insert: Omit<CreatorProfile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CreatorProfile, "id" | "created_at">>;
      };
      brand_profiles: {
        Row: BrandProfile;
        Insert: Omit<BrandProfile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BrandProfile, "id" | "created_at">>;
      };
    };
  };
}
