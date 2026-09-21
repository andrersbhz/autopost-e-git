ALTER TABLE public.social_interactions 
ADD COLUMN IF NOT EXISTS interaction_type TEXT DEFAULT 'comment';

-- Criar um índice para busca rápida por tipo
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON public.social_interactions(interaction_type);
