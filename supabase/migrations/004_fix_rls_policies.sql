-- Fix RLS policies to allow authenticated users to view campaigns and users

-- Drop existing campaign policies
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;

-- Create new policy that allows any authenticated user to view active campaigns
CREATE POLICY "Authenticated users can view active campaigns" ON public.campaigns
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (status = 'active' OR brand_id = auth.uid())
    );

-- Drop existing user policies that might conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by all authenticated users" ON public.users;

-- Create a single comprehensive policy for viewing users
CREATE POLICY "Authenticated users can view all profiles" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Ensure users can still update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Ensure users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
