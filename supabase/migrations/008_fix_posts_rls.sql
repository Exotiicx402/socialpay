-- Fix RLS policies for posts table

-- 1. Fix creator insert policy to check for approved application
DROP POLICY IF EXISTS "Creators can submit posts" ON public.posts;

CREATE POLICY "Creators can submit posts to approved campaigns" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id AND
        EXISTS (
            SELECT 1 FROM public.campaign_applications
            WHERE campaign_applications.campaign_id = posts.campaign_id
            AND campaign_applications.creator_id = auth.uid()
            AND campaign_applications.status = 'approved'
        )
    );

-- 2. Ensure creators can update their own posts (for resubmissions)
DROP POLICY IF EXISTS "Creators can update their own posts" ON public.posts;
CREATE POLICY "Creators can update their own posts" ON public.posts
    FOR UPDATE USING (creator_id = auth.uid());

-- 3. Ensure brands can update posts for their campaigns (approve/reject)
-- This policy should already exist from initial schema, but recreate to be safe
DROP POLICY IF EXISTS "Brands can update post status" ON public.posts;
CREATE POLICY "Brands can update post status" ON public.posts
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

-- 4. Ensure brands can view posts for their campaigns
DROP POLICY IF EXISTS "Brands can view posts for their campaigns" ON public.posts;
CREATE POLICY "Brands can view posts for their campaigns" ON public.posts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    );

-- 5. Ensure creators can view their own posts
DROP POLICY IF EXISTS "Creators can view their own posts" ON public.posts;
CREATE POLICY "Creators can view their own posts" ON public.posts
    FOR SELECT USING (creator_id = auth.uid());
