
-- Restrict user_id column on authors from anonymous visitors
REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, name, bio, role, category, avatar_url, created_at, updated_at) ON public.authors TO anon;

-- Restrict admin contact columns on platform_settings from anonymous visitors
REVOKE SELECT ON public.platform_settings FROM anon;
GRANT SELECT (
  id, singleton, brand_name, brand_short, tagline, description,
  logo_url, favicon_url, hero_video_url, primary_color, accent_color,
  footer_text, offer_badge, cta_primary, cta_secondary, plans_json, updated_at
) ON public.platform_settings TO anon;
