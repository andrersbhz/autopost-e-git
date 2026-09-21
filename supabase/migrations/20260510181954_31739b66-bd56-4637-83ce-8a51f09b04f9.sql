-- Add dashboard_widgets column to user_settings if it doesn't exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB DEFAULT '{"stats": true, "meta": true, "robot": true, "trends": true, "categories": true, "audit": true, "alternate_stats": true}'::jsonb;

-- Ensure RLS is enabled and policies are correct (assuming they already are, but good to check)
-- No changes needed to policies as they usually cover all columns for the user_id.