ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS interaction_mode TEXT DEFAULT 'standard';

COMMENT ON COLUMN public.user_settings.interaction_mode IS 'Define o perfil de interação do robô (ex: standard, journalist, creative, random).';