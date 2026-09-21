
REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, name, avatar_url, bio, role, category, created_at, updated_at) ON public.authors TO anon;

REVOKE SELECT ON public.platform_settings FROM anon;
GRANT SELECT (
  id, singleton, brand_name, brand_short, tagline, description, logo_url, favicon_url,
  hero_video_url, hero_image_url, hero_title_color, hero_title_size, hero_description_color,
  hero_description_size, hero_link_url, hero_link_label, hero_button_bg_color, hero_button_text_color,
  primary_color, accent_color, cta_primary, cta_secondary, offer_badge, footer_text,
  button_radius, button_hover_style, font_color_base, font_color_muted, plans_json, updated_at
) ON public.platform_settings TO anon;
