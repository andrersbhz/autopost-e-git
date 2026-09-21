ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS hero_title_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS hero_title_size integer DEFAULT 64,
  ADD COLUMN IF NOT EXISTS hero_description_color text DEFAULT '#b3b3b3',
  ADD COLUMN IF NOT EXISTS hero_description_size integer DEFAULT 22,
  ADD COLUMN IF NOT EXISTS hero_link_url text,
  ADD COLUMN IF NOT EXISTS hero_link_label text DEFAULT 'Saiba mais',
  ADD COLUMN IF NOT EXISTS hero_button_bg_color text DEFAULT '#a3ff12',
  ADD COLUMN IF NOT EXISTS hero_button_text_color text DEFAULT '#0a1128';

UPDATE public.platform_settings
SET hero_title_color = COALESCE(hero_title_color, '#ffffff'),
    hero_title_size = COALESCE(hero_title_size, 64),
    hero_description_color = COALESCE(hero_description_color, '#b3b3b3'),
    hero_description_size = COALESCE(hero_description_size, 22),
    hero_link_label = COALESCE(hero_link_label, 'Saiba mais'),
    hero_button_bg_color = COALESCE(hero_button_bg_color, primary_color, '#a3ff12'),
    hero_button_text_color = COALESCE(hero_button_text_color, '#0a1128');

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_hero_title_size_check,
  ADD CONSTRAINT platform_settings_hero_title_size_check CHECK (hero_title_size BETWEEN 24 AND 120),
  DROP CONSTRAINT IF EXISTS platform_settings_hero_description_size_check,
  ADD CONSTRAINT platform_settings_hero_description_size_check CHECK (hero_description_size BETWEEN 12 AND 48);
