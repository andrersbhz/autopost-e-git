ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS button_radius text DEFAULT '0.5rem',
ADD COLUMN IF NOT EXISTS button_hover_style text DEFAULT 'glow',
ADD COLUMN IF NOT EXISTS font_color_base text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS font_color_muted text DEFAULT 'rgba(255,255,255,0.6)';

-- Grant access to the new columns for authenticated users
GRANT SELECT (button_radius, button_hover_style, font_color_base, font_color_muted) ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
