
-- Create a secure config table for the encryption key
CREATE TABLE IF NOT EXISTS public._internal_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Only service_role can access this table
ALTER TABLE public._internal_config ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no access for authenticated/anon
REVOKE ALL ON public._internal_config FROM authenticated, anon;

-- Update encrypt functions to read key from config table
CREATE OR REPLACE FUNCTION public.encrypt_user_settings_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  SELECT value INTO enc_key FROM public._internal_config WHERE key = 'encryption_key';
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

CREATE OR REPLACE FUNCTION public.encrypt_facebook_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  SELECT value INTO enc_key FROM public._internal_config WHERE key = 'encryption_key';
  IF enc_key IS NOT NULL AND enc_key != '' THEN
    IF NEW.access_token IS NOT NULL AND NEW.access_token != ''
       AND left(NEW.access_token, 10) != 'ENCRYPTED:' THEN
      NEW.access_token := 'ENCRYPTED:' || encode(pgp_sym_encrypt(NEW.access_token, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
