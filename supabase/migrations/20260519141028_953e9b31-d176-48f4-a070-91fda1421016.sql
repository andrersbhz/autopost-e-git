ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS dashboard_order TEXT[] DEFAULT ARRAY['stats', 'alternate_stats', 'chart', 'meta', 'robot', 'trends', 'categories', 'audit'];