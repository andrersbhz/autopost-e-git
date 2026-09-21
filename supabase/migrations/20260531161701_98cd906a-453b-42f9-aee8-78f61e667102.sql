-- Create table for Google Search Console OAuth states
CREATE TABLE public.google_search_console_oauth_states (
    state TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '15 minutes')
);

GRANT SELECT, INSERT, DELETE ON public.google_search_console_oauth_states TO service_role;
GRANT SELECT, INSERT, DELETE ON public.google_search_console_oauth_states TO authenticated;

-- Enable RLS
ALTER TABLE public.google_search_console_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own states" 
ON public.google_search_console_oauth_states 
FOR ALL 
USING (auth.uid() = user_id);

-- Add column for Search Console token to user_settings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_settings' AND COLUMN_NAME = 'google_search_console_token') THEN
        ALTER TABLE public.user_settings ADD COLUMN google_search_console_token TEXT;
    END IF;
END $$;
