
-- Fix encrypt_user_settings_credentials to use extensions schema
CREATE OR REPLACE FUNCTION public.encrypt_user_settings_credentials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  enc_key text;
BEGIN
  SELECT value INTO enc_key FROM public._internal_config WHERE key = 'encryption_key';
  IF enc_key IS NOT NULL AND enc_key != '' THEN
    IF NEW.wordpress_app_password IS NOT NULL AND NEW.wordpress_app_password != ''
       AND left(NEW.wordpress_app_password, 10) != 'ENCRYPTED:' THEN
      NEW.wordpress_app_password := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.wordpress_app_password, enc_key), 'base64');
    END IF;
    IF NEW.facebook_access_token IS NOT NULL AND NEW.facebook_access_token != ''
       AND left(NEW.facebook_access_token, 10) != 'ENCRYPTED:' THEN
      NEW.facebook_access_token := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.facebook_access_token, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix encrypt_facebook_credentials to use extensions schema
CREATE OR REPLACE FUNCTION public.encrypt_facebook_credentials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  enc_key text;
BEGIN
  SELECT value INTO enc_key FROM public._internal_config WHERE key = 'encryption_key';
  IF enc_key IS NOT NULL AND enc_key != '' THEN
    IF NEW.access_token IS NOT NULL AND NEW.access_token != ''
       AND left(NEW.access_token, 10) != 'ENCRYPTED:' THEN
      NEW.access_token := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.access_token, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix decrypt_credential to use extensions schema
CREATE OR REPLACE FUNCTION public.decrypt_credential(val text, enc_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF val IS NULL OR val = '' THEN RETURN val; END IF;
  IF left(val, 10) != 'ENCRYPTED:' THEN RETURN val; END IF;
  IF enc_key IS NULL OR enc_key = '' THEN RETURN val; END IF;
  RETURN extensions.pgp_sym_decrypt(decode(substring(val from 11), 'base64'), enc_key);
END;
$function$;

-- Fix encrypt_credential to use extensions schema
CREATE OR REPLACE FUNCTION public.encrypt_credential(val text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  enc_key text;
BEGIN
  IF val IS NULL OR val = '' THEN RETURN val; END IF;
  IF left(val, 4) = '\xc3' OR left(val, 7) = 'ENCRYPTED:' THEN RETURN val; END IF;
  enc_key := current_setting('app.encryption_key', true);
  IF enc_key IS NULL OR enc_key = '' THEN RETURN val; END IF;
  RETURN 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(val, enc_key), 'base64');
END;
$function$;

-- Ensure triggers exist
DROP TRIGGER IF EXISTS trg_encrypt_user_settings ON public.user_settings;
CREATE TRIGGER trg_encrypt_user_settings
  BEFORE INSERT OR UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_user_settings_credentials();

DROP TRIGGER IF EXISTS trg_encrypt_facebook ON public.facebook_accounts;
CREATE TRIGGER trg_encrypt_facebook
  BEFORE INSERT OR UPDATE ON public.facebook_accounts
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_facebook_credentials();
