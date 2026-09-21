DROP POLICY IF EXISTS "Published articles are publicly viewable" ON public.articles;

CREATE OR REPLACE VIEW public.public_articles
WITH (security_invoker = false)
AS
SELECT
  id, title, content, excerpt, category, slug, seo_title, seo_keyword,
  meta_title, meta_description, focus_keyword, featured_image_url,
  image_alt, image_caption, visual_elements, author_id, trending_topic,
  ai_provider, published_at, scheduled_at, created_at, updated_at,
  status, wordpress_post_id
FROM public.articles
WHERE status = 'published';

GRANT SELECT ON public.public_articles TO anon, authenticated;

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;

DROP POLICY IF EXISTS "System can insert automation logs" ON public.automation_logs;
CREATE POLICY "Users can insert their own automation logs"
ON public.automation_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

REVOKE SELECT (access_token) ON public.facebook_accounts FROM anon, authenticated;

REVOKE SELECT (password) ON public.instagram_accounts_direct FROM anon, authenticated;

REVOKE SELECT (
  wordpress_app_password,
  wordpress_application_password,
  facebook_access_token,
  gemini_api_key,
  openai_api_key,
  groq_api_key,
  azure_openai_api_key,
  linkedin_access_token
) ON public.user_settings FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.encrypt_credential(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.decrypt_credential(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.encrypt_facebook_credentials() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.encrypt_user_settings_credentials() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.assign_author_by_category() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.clean_old_trending_topics() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_credentials_status() TO authenticated;

REVOKE ALL ON public._internal_config FROM anon, authenticated;
GRANT ALL ON public._internal_config TO service_role;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public can read article images by direct URL"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'article-images');