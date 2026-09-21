CREATE TABLE public.social_interactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'facebook', 'instagram'
    external_id TEXT NOT NULL, -- ID do comentário/mensagem na plataforma
    page_id TEXT NOT NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    ai_response TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'replied', 'ignored', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, platform, external_id)
);

ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social interactions" 
ON public.social_interactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social interactions" 
ON public.social_interactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social interactions" 
ON public.social_interactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE TRIGGER update_social_interactions_updated_at
BEFORE UPDATE ON public.social_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();