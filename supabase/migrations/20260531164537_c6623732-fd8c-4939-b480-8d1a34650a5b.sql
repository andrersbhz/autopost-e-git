-- Create a table for Google Indexing history
CREATE TABLE IF NOT EXISTS public.google_indexing_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'error'
    response_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.google_indexing_history TO authenticated;
GRANT ALL ON public.google_indexing_history TO service_role;

-- Enable RLS
ALTER TABLE public.google_indexing_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own indexing history" 
ON public.google_indexing_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own indexing history" 
ON public.google_indexing_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_google_indexing_history_user_id ON public.google_indexing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_google_indexing_history_article_id ON public.google_indexing_history(article_id);
