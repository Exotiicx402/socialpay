-- SocialPay Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_type AS ENUM ('creator', 'brand');
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE platform_type AS ENUM ('tiktok', 'youtube', 'instagram');
CREATE TYPE post_status AS ENUM ('pending', 'approved', 'tracking', 'completed', 'rejected');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    user_type user_type NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    profile_image TEXT,
    bio TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '{
        "platforms": [],
        "min_followers": 0,
        "content_type": [],
        "hashtags": [],
        "mentions": []
    }',
    payout_rate JSONB NOT NULL DEFAULT '{
        "per_view": 0.01,
        "per_like": 0.05,
        "per_comment": 0.10,
        "per_share": 0.15
    }',
    budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
    spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status campaign_status NOT NULL DEFAULT 'active',
    max_creators INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Campaign applications (creators apply to campaigns)
CREATE TABLE public.campaign_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, creator_id)
);

-- Posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    post_url TEXT NOT NULL,
    post_id TEXT, -- Platform-specific post ID extracted from URL
    thumbnail_url TEXT,
    title TEXT,
    status post_status NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

-- Post metrics table (tracks performance over time)
CREATE TABLE public.post_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts table
CREATE TABLE public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status payout_status NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    payment_details JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Creator profiles (additional creator-specific info)
CREATE TABLE public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tiktok_username TEXT,
    tiktok_followers INTEGER DEFAULT 0,
    youtube_channel TEXT,
    youtube_subscribers INTEGER DEFAULT 0,
    instagram_username TEXT,
    instagram_followers INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    pending_earnings DECIMAL(12, 2) DEFAULT 0,
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand profiles (additional brand-specific info)
CREATE TABLE public.brand_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_size TEXT,
    industry TEXT,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    active_campaigns INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_posts_campaign_id ON public.posts(campaign_id);
CREATE INDEX idx_posts_creator_id ON public.posts(creator_id);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_post_metrics_post_id ON public.post_metrics(post_id);
CREATE INDEX idx_payouts_creator_id ON public.payouts(creator_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_campaign_applications_campaign_id ON public.campaign_applications(campaign_id);
CREATE INDEX idx_campaign_applications_creator_id ON public.campaign_applications(creator_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by all authenticated users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for campaigns table
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
    FOR SELECT USING (status = 'active' OR brand_id = auth.uid());

CREATE POLICY "Brands can create campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (
        auth.uid() = brand_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'brand')
    );

CREATE POLICY "Brands can update their own campaigns" ON public.campaigns
    FOR UPDATE USING (brand_id = auth.uid());

CREATE POLICY "Brands can delete their own campaigns" ON public.campaigns
    FOR DELETE USING (brand_id = auth.uid());

-- RLS Policies for campaign_applications table
CREATE POLICY "Creators can view their own applications" ON public.campaign_applications
    FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "Brands can view applications for their campaigns" ON public.campaign_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

CREATE POLICY "Creators can apply to campaigns" ON public.campaign_applications
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'creator')
    );

CREATE POLICY "Brands can update application status" ON public.campaign_applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

-- RLS Policies for posts table
CREATE POLICY "Creators can view their own posts" ON public.posts
    FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "Brands can view posts for their campaigns" ON public.posts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

CREATE POLICY "Creators can submit posts" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'creator')
    );

CREATE POLICY "Brands can update post status" ON public.posts
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

-- RLS Policies for post_metrics table
CREATE POLICY "Users can view metrics for their posts" ON public.post_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_metrics.post_id
            AND (posts.creator_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.campaigns WHERE id = posts.campaign_id AND brand_id = auth.uid()))
        )
    );

-- RLS Policies for payouts table
CREATE POLICY "Creators can view their own payouts" ON public.payouts
    FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "Brands can view payouts for their campaigns" ON public.payouts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

-- RLS Policies for creator_profiles table
CREATE POLICY "Creator profiles are viewable by authenticated users" ON public.creator_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Creators can update their own profile" ON public.creator_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Creators can insert their own profile" ON public.creator_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for brand_profiles table
CREATE POLICY "Brand profiles are viewable by authenticated users" ON public.brand_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Brands can update their own profile" ON public.brand_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Brands can insert their own profile" ON public.brand_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, user_type, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'creator'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );

    -- Create corresponding profile based on user type
    IF (NEW.raw_user_meta_data->>'user_type') = 'creator' THEN
        INSERT INTO public.creator_profiles (user_id)
        VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'user_type') = 'brand' THEN
        INSERT INTO public.brand_profiles (user_id)
        VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_creator_profiles_updated_at
    BEFORE UPDATE ON public.creator_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_brand_profiles_updated_at
    BEFORE UPDATE ON public.brand_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
