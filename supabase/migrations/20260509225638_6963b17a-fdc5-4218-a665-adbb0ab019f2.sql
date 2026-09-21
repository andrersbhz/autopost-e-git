ALTER TABLE public.facebook_accounts 
ADD COLUMN IF NOT EXISTS last_metrics JSONB,
ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMP WITH TIME ZONE;

-- Add a column to user_settings to configure refresh interval
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS metrics_refresh_interval INTEGER DEFAULT 30; -- Minutes