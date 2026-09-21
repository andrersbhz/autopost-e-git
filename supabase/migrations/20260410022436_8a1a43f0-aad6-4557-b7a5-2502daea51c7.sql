
-- Re-grant INSERT/UPDATE on sensitive columns for authenticated role
GRANT INSERT (wordpress_app_password, facebook_access_token) ON public.user_settings TO authenticated;
GRANT UPDATE (wordpress_app_password, facebook_access_token) ON public.user_settings TO authenticated;

-- Same for facebook_accounts
GRANT INSERT (access_token) ON public.facebook_accounts TO authenticated;
GRANT UPDATE (access_token) ON public.facebook_accounts TO authenticated;

-- Also grant for anon role (used by supabase-js with anon key + JWT)
GRANT INSERT (wordpress_app_password, facebook_access_token) ON public.user_settings TO anon;
GRANT UPDATE (wordpress_app_password, facebook_access_token) ON public.user_settings TO anon;
GRANT INSERT (access_token) ON public.facebook_accounts TO anon;
GRANT UPDATE (access_token) ON public.facebook_accounts TO anon;
