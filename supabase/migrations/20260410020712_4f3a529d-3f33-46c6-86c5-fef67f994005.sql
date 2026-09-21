
-- Function to encrypt a value (used by triggers)
CREATE OR REPLACE FUNCTION public.encrypt_credential(val text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  IF val IS NULL OR val = '' THEN RETURN val; END IF;
  -- Skip if already encrypted (pgcrypto output starts with \xc3)
  IF left(val, 4) = '\xc3' OR left(val, 7) = 'ENCRYPTED:' THEN RETURN val; END IF;
  enc_key := current_setting('app.encryption_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN RETURN val; END IF;
  RETURN 'ENCRYPTED:' || encode(pgp_sym_encrypt(val, enc_key), 'base64');
END;
$$;

-- Function to decrypt a value (used only by service-role edge functions)
CREATE OR REPLACE FUNCTION public.decrypt_credential(val text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  IF val IS NULL OR val = '' THEN RETURN val; END IF;
  IF left(val, 10) != 'ENCRYPTED:' THEN RETURN val; END IF;
  enc_key := current_setting('app.encryption_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN RETURN val; END IF;
  RETURN pgp_sym_decrypt(decode(substring(val from 11), 'base64'), enc_key);
END;
$$;

-- Trigger function for user_settings
CREATE OR REPLACE FUNCTION public.encrypt_user_settings_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  enc_key := current_setting('app.encryption_key', true);
  IF enc_key IS NOT NULL AND enc_key != '' THEN
    IF NEW.wordpress_app_password IS NOT NULL AND NEW.wordpress_app_password != ''
       AND left(NEW.wordpress_app_password, 10) != 'ENCRYPTED:' THEN
      NEW.wordpress_app_password := 'ENCRYPTED:' || encode(pgp_sym_encrypt(NEW.wordpress_app_password, enc_key), 'base64');
    END IF;
    IF NEW.facebook_access_token IS NOT NULL AND NEW.facebook_access_token != ''
       AND left(NEW.facebook_access_token, 10) != 'ENCRYPTED:' THEN
      NEW.facebook_access_token := 'ENCRYPTED:' || encode(pgp_sym_encrypt(NEW.facebook_access_token, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for facebook_accounts
CREATE OR REPLACE FUNCTION public.encrypt_facebook_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  enc_key := current_setting('app.encryption_key', true);
  IF enc_key IS NOT NULL AND enc_key != '' THEN
    IF NEW.access_token IS NOT NULL AND NEW.access_token != ''
       AND left(NEW.access_token, 10) != 'ENCRYPTED:' THEN
      NEW.access_token := 'ENCRYPTED:' || encode(pgp_sym_encrypt(NEW.access_token, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER encrypt_user_settings_creds
  BEFORE INSERT OR UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_user_settings_credentials();

CREATE TRIGGER encrypt_facebook_creds
  BEFORE INSERT OR UPDATE ON public.facebook_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_facebook_credentials();

-- Revoke execute on decrypt from public roles (only service_role can use it)
REVOKE EXECUTE ON FUNCTION public.decrypt_credential(text) FROM authenticated, anon;
