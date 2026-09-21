-- Add columns to social_interactions
ALTER TABLE public.social_interactions 
ADD COLUMN IF NOT EXISTS author_avatar TEXT,
ADD COLUMN IF NOT EXISTS original_link TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add social_reply_prompt to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS social_reply_prompt TEXT DEFAULT 'Você é um gestor de redes sociais humano e empático. Responda de forma curta, natural, empática e amigável. Use um tom humano, não pareça um robô. Responda em Português do Brasil.';
