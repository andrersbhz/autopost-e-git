-- Tabela para rastrear seguidores automáticos
CREATE TABLE IF NOT EXISTS public.social_follows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'instagram',
    target_external_id TEXT NOT NULL,
    target_username TEXT,
    target_avatar TEXT,
    followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    unfollowed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'following', -- 'following', 'unfollowed', 'error'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own follows" 
ON public.social_follows FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows" 
ON public.social_follows FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follows" 
ON public.social_follows FOR UPDATE 
USING (auth.uid() = user_id);

-- Adicionar gatilho para updated_at
CREATE TRIGGER update_social_follows_updated_at
BEFORE UPDATE ON public.social_follows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar novos campos em user_settings para configuração de crescimento
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS instagram_follows_per_day_min INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS instagram_follows_per_day_max INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS instagram_follow_duration_min INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS instagram_follow_duration_max INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS instagram_automation_human_like BOOLEAN DEFAULT TRUE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_social_follows_user_status ON public.social_follows(user_id, status);
CREATE INDEX IF NOT EXISTS idx_social_follows_unfollow_date ON public.social_follows(followed_at) WHERE status = 'following';
