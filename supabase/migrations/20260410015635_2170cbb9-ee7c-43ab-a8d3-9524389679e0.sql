
-- Revoke SELECT on sensitive columns from authenticated and anon roles
-- They can still UPDATE/INSERT these columns

-- user_settings: revoke select on sensitive cols, grant on the rest
REVOKE SELECT ON public.user_settings FROM authenticated, anon;

GRANT SELECT (id, user_id, wordpress_url, wordpress_username, google_analytics_property_id,
  facebook_page_id, instagram_account_id, categories, articles_per_day, auto_publish,
  created_at, updated_at) ON public.user_settings TO authenticated;

-- facebook_accounts: revoke select on access_token, grant on the rest  
REVOKE SELECT ON public.facebook_accounts FROM authenticated, anon;

GRANT SELECT (id, user_id, page_name, page_id, instagram_account_id, is_active, created_at)
  ON public.facebook_accounts TO authenticated;

-- Create helper function to check if credentials are configured (runs as definer, no token exposure)
CREATE OR REPLACE FUNCTION public.get_credentials_status()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'has_wp_password', (wordpress_app_password IS NOT NULL AND wordpress_app_password <> ''),
    'has_fb_token', (facebook_access_token IS NOT NULL AND facebook_access_token <> ''),
    'wordpress_url', wordpress_url,
    'wordpress_username', wordpress_username
  )
  FROM public.user_settings
  WHERE user_id = auth.uid()
$$;
