-- Create automation_logs table for telemetry
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT 'info', -- 'info', 'warn', 'error'
    module TEXT NOT NULL, -- 'sync', 'reply', 'automation'
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on automation_logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Policies for automation_logs
CREATE POLICY "Users can view their own logs" 
ON public.automation_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Fix user_settings RLS policies (Address INFO 1: RLS Enabled No Policy)
-- Check if RLS is already enabled (usually is), then add proper policies
DO $$ 
BEGIN
    -- Only enable if not enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'user_settings' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing if they exist to avoid conflicts and recreate securely
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix SECURITY DEFINER functions search_path (Address WARN 2)
ALTER FUNCTION public.decrypt_credential(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.encrypt_credential(text) SET search_path = public, extensions;
ALTER FUNCTION public.encrypt_user_settings_credentials() SET search_path = public;
ALTER FUNCTION public.encrypt_facebook_credentials() SET search_path = public, extensions;
ALTER FUNCTION public.get_credentials_status() SET search_path = public;
ALTER FUNCTION public.clean_old_trending_topics() SET search_path = public;

-- Revoke public execute from security definer functions (Address WARN 4-9)
REVOKE EXECUTE ON FUNCTION public.decrypt_credential(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_credential(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_credentials_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clean_old_trending_topics() FROM PUBLIC;

-- Allow authenticated users to execute only what's necessary
GRANT EXECUTE ON FUNCTION public.get_credentials_status() TO authenticated;
-- decrypt_credential is used by triggers/edge functions via service role, so PUBLIC revoke is safe.
