-- Add automation_enabled column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT false;

-- Create an index for performance when scanning for active automation
CREATE INDEX IF NOT EXISTS idx_user_settings_automation_enabled ON public.user_settings(automation_enabled) WHERE automation_enabled = true;