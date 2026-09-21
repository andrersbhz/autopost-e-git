ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS follower_growth_mode BOOLEAN DEFAULT false;

-- Atualizar o comentário da coluna
COMMENT ON COLUMN public.user_settings.follower_growth_mode IS 'Habilita o modo do robô focado em converter interações em novos seguidores.';