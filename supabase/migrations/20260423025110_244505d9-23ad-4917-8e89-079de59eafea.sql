-- Create table for facebook accounts
CREATE TABLE IF NOT EXISTS public.facebook_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT,
  access_token TEXT NOT NULL,
  instagram_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for facebook_accounts
ALTER TABLE public.facebook_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for facebook_accounts
CREATE POLICY "Users can view their own facebook accounts"
  ON public.facebook_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facebook accounts"
  ON public.facebook_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facebook accounts"
  ON public.facebook_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facebook accounts"
  ON public.facebook_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for OAuth states
CREATE TABLE IF NOT EXISTS public.facebook_oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour')
);

-- Enable RLS for facebook_oauth_states
ALTER TABLE public.facebook_oauth_states ENABLE ROW LEVEL SECURITY;

-- Note: No standard RLS policies needed as functions access this with service_role,
-- but adding basic user check just in case.
CREATE POLICY "Users can view their own states"
  ON public.facebook_oauth_states FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facebook_accounts_updated_at
BEFORE UPDATE ON public.facebook_accounts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();