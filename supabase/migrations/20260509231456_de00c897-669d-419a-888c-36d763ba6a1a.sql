-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_interactions_user_id ON public.social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON public.automation_logs(user_id);

-- Ensure RLS is active for automation_logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own logs (safety check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'automation_logs' 
        AND policyname = 'Users can view their own automation logs'
    ) THEN
        CREATE POLICY "Users can view their own automation logs"
        ON public.automation_logs
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'automation_logs' 
        AND policyname = 'System can insert automation logs'
    ) THEN
        CREATE POLICY "System can insert automation logs"
        ON public.automation_logs
        FOR INSERT
        WITH CHECK (true); -- Service role usually bypasses this, but keeping it for flexibility
    END IF;
END
$$;