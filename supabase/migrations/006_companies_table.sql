-- Companies table for brand onboarding
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add company_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);

-- RLS policies for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Users can view their own company
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own company
CREATE POLICY "Users can insert own company"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own company
CREATE POLICY "Users can update own company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Function to link company to user after creation
CREATE OR REPLACE FUNCTION link_company_to_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET company_id = NEW.id WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-link company to user
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION link_company_to_user();
