
-- 1. Fix storage policy: enforce folder ownership on INSERT for article-images
DROP POLICY IF EXISTS "Authenticated users can upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder article-images" ON storage.objects;

CREATE POLICY "Users can upload to own folder in article-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'article-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2. Restrict access to sensitive column user_id on authors (keep public read for blog)
REVOKE SELECT (user_id) ON public.authors FROM anon, authenticated;

-- 3. Lock down SECURITY DEFINER functions: revoke broad EXECUTE, regrant only what app needs
REVOKE EXECUTE ON FUNCTION public.encrypt_credential(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_credential(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clean_old_trending_topics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_credentials_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_online_locations(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_online_status(text, double precision, double precision, text, text, text) FROM PUBLIC;

-- Regrant only to authenticated where the app calls them
GRANT EXECUTE ON FUNCTION public.get_credentials_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_locations(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_online_status(text, double precision, double precision, text, text, text) TO anon, authenticated;
