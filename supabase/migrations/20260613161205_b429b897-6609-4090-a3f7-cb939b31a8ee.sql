
-- 1) Articles: restrict public reads to published only
DROP POLICY IF EXISTS "Public can read displayable articles" ON public.articles;
CREATE POLICY "Public can read published articles"
  ON public.articles FOR SELECT
  USING (status = 'published');

-- 2) Storage: drop the broad upload policy that bypasses the folder check
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;

-- 3) facebook_accounts: hide access_token from client roles
REVOKE SELECT ON public.facebook_accounts FROM anon, authenticated;
GRANT SELECT (id, user_id, page_id, page_name, picture_url, instagram_account_id, is_active, last_metrics, metrics_updated_at, created_at, updated_at) ON public.facebook_accounts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.facebook_accounts TO authenticated;
GRANT ALL ON public.facebook_accounts TO service_role;

-- 4) instagram_accounts_direct: hide password from client roles + encrypt at rest
REVOKE SELECT ON public.instagram_accounts_direct FROM anon, authenticated;
GRANT SELECT (id, user_id, username, is_active, created_at, updated_at) ON public.instagram_accounts_direct TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.instagram_accounts_direct TO authenticated;
GRANT ALL ON public.instagram_accounts_direct TO service_role;

CREATE OR REPLACE FUNCTION public.encrypt_instagram_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  enc_key text;
BEGIN
  SELECT value INTO enc_key FROM public._internal_config WHERE key = 'encryption_key';
  IF enc_key IS NOT NULL AND enc_key <> '' THEN
    IF NEW.password IS NOT NULL AND NEW.password <> ''
       AND left(NEW.password, 10) <> 'ENCRYPTED:' THEN
      NEW.password := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.password, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_instagram_password_trigger ON public.instagram_accounts_direct;
CREATE TRIGGER encrypt_instagram_password_trigger
  BEFORE INSERT OR UPDATE ON public.instagram_accounts_direct
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_instagram_password();

-- Encrypt any existing plaintext passwords
DO $$
DECLARE
  enc_key text;
BEGIN
  SELECT value INTO enc_key FROM public._internal_config WHERE key = 'encryption_key';
  IF enc_key IS NOT NULL AND enc_key <> '' THEN
    UPDATE public.instagram_accounts_direct
    SET password = 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(password, enc_key), 'base64')
    WHERE password IS NOT NULL AND password <> '' AND left(password, 10) <> 'ENCRYPTED:';
  END IF;
END $$;
