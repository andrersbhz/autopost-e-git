CREATE TABLE public.facebook_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_name TEXT,
  page_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  instagram_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.facebook_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own facebook accounts" ON public.facebook_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own facebook accounts" ON public.facebook_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own facebook accounts" ON public.facebook_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own facebook accounts" ON public.facebook_accounts FOR DELETE USING (auth.uid() = user_id);