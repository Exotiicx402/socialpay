-- Enhanced campaigns table with additional fields for the campaign wizard
-- Run this migration to add new fields to the campaigns table

-- Add new columns to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS brief_description TEXT,
ADD COLUMN IF NOT EXISTS key_talking_points TEXT[],
ADD COLUMN IF NOT EXISTS dos TEXT[],
ADD COLUMN IF NOT EXISTS donts TEXT[],
ADD COLUMN IF NOT EXISTS call_to_action TEXT,
ADD COLUMN IF NOT EXISTS target_niche TEXT,
ADD COLUMN IF NOT EXISTS min_follower_count INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS max_follower_count INTEGER,
ADD COLUMN IF NOT EXISTS payout_model TEXT NOT NULL DEFAULT 'base_performance',
ADD COLUMN IF NOT EXISTS payout_base_rate_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_performance_rate_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_max_per_creator_cents INTEGER,
ADD COLUMN IF NOT EXISTS total_budget_cents INTEGER,
ADD COLUMN IF NOT EXISTS campaign_images TEXT[];

-- Add check constraint for payout_model
ALTER TABLE public.campaigns
ADD CONSTRAINT check_payout_model
CHECK (payout_model IN ('base_performance', 'performance_only', 'fixed'));

-- Add check constraint for follower counts
ALTER TABLE public.campaigns
ADD CONSTRAINT check_follower_range
CHECK (min_follower_count >= 0 AND (max_follower_count IS NULL OR max_follower_count >= min_follower_count));

-- Comment on new columns
COMMENT ON COLUMN public.campaigns.brief_description IS 'Short description of the product/service being promoted';
COMMENT ON COLUMN public.campaigns.key_talking_points IS 'Array of key points creators should mention';
COMMENT ON COLUMN public.campaigns.dos IS 'Array of things creators should do';
COMMENT ON COLUMN public.campaigns.donts IS 'Array of things creators should avoid';
COMMENT ON COLUMN public.campaigns.call_to_action IS 'The CTA creators should include';
COMMENT ON COLUMN public.campaigns.target_niche IS 'Target creator niche (gaming, beauty, tech, etc.)';
COMMENT ON COLUMN public.campaigns.min_follower_count IS 'Minimum follower count for eligible creators';
COMMENT ON COLUMN public.campaigns.max_follower_count IS 'Maximum follower count for eligible creators (null = unlimited)';
COMMENT ON COLUMN public.campaigns.payout_model IS 'Payment model: base_performance, performance_only, or fixed';
COMMENT ON COLUMN public.campaigns.payout_base_rate_cents IS 'Base payment amount in cents';
COMMENT ON COLUMN public.campaigns.payout_performance_rate_cents IS 'Performance bonus per 1000 views in cents';
COMMENT ON COLUMN public.campaigns.payout_max_per_creator_cents IS 'Maximum payout per creator in cents';
COMMENT ON COLUMN public.campaigns.total_budget_cents IS 'Total campaign budget in cents';
COMMENT ON COLUMN public.campaigns.campaign_images IS 'Array of image URLs for campaign assets';

-- Create index for filtering by niche and payout model
CREATE INDEX IF NOT EXISTS idx_campaigns_target_niche ON public.campaigns(target_niche);
CREATE INDEX IF NOT EXISTS idx_campaigns_payout_model ON public.campaigns(payout_model);
