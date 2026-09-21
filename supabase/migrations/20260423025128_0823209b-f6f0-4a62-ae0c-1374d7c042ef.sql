-- Add missing columns to user_settings if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'wordpress_url') THEN
    ALTER TABLE public.user_settings ADD COLUMN wordpress_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'wordpress_username') THEN
    ALTER TABLE public.user_settings ADD COLUMN wordpress_username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'wordpress_application_password') THEN
    ALTER TABLE public.user_settings ADD COLUMN wordpress_application_password TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'facebook_page_id') THEN
    ALTER TABLE public.user_settings ADD COLUMN facebook_page_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'facebook_access_token') THEN
    ALTER TABLE public.user_settings ADD COLUMN facebook_access_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'instagram_account_id') THEN
    ALTER TABLE public.user_settings ADD COLUMN instagram_account_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'google_analytics_property_id') THEN
    ALTER TABLE public.user_settings ADD COLUMN google_analytics_property_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'categories') THEN
    ALTER TABLE public.user_settings ADD COLUMN categories TEXT[] DEFAULT '{"esportes", "politica", "policia", "saude", "celebridades", "financas"}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'articles_per_day') THEN
    ALTER TABLE public.user_settings ADD COLUMN articles_per_day INTEGER DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'auto_publish') THEN
    ALTER TABLE public.user_settings ADD COLUMN auto_publish BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'writer_prompt') THEN
    ALTER TABLE public.user_settings ADD COLUMN writer_prompt TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'gemini_api_key') THEN
    ALTER TABLE public.user_settings ADD COLUMN gemini_api_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'openai_api_key') THEN
    ALTER TABLE public.user_settings ADD COLUMN openai_api_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'groq_api_key') THEN
    ALTER TABLE public.user_settings ADD COLUMN groq_api_key TEXT;
  END IF;
END $$;

-- Fix RLS Policies for facebook_oauth_states
CREATE POLICY "Users can insert their own states"
  ON public.facebook_oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own states"
  ON public.facebook_oauth_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own states"
  ON public.facebook_oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- Resolve Security Linter: Set search_path for functions
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
