-- Add image_mode column to user_settings
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_settings' AND COLUMN_NAME = 'image_mode') THEN
        ALTER TABLE public.user_settings ADD COLUMN image_mode TEXT NOT NULL DEFAULT 'ai';
    END IF;
END $$;

COMMENT ON COLUMN public.user_settings.image_mode IS 'Define o modo de imagem destacada: ai (gerada por IA), manual (upload) ou none (nenhuma).';
