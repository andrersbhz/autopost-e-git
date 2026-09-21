
-- Add openai_api_key column
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS openai_api_key text;

-- Revoke select on sensitive column
REVOKE SELECT (openai_api_key) ON public.user_settings FROM anon, authenticated;

-- Update encryption trigger to also handle openai_api_key
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
    IF NEW.gemini_api_key IS NOT NULL AND NEW.gemini_api_key != ''
       AND left(NEW.gemini_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.gemini_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.gemini_api_key, enc_key), 'base64');
    END IF;
    IF NEW.openai_api_key IS NOT NULL AND NEW.openai_api_key != ''
       AND left(NEW.openai_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.openai_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.openai_api_key, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update credentials status to include openai
CREATE OR REPLACE FUNCTION public.get_credentials_status()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'has_wp_password', (wordpress_app_password IS NOT NULL AND wordpress_app_password <> ''),
    'has_fb_token', (facebook_access_token IS NOT NULL AND facebook_access_token <> ''),
    'has_gemini_key', (gemini_api_key IS NOT NULL AND gemini_api_key <> ''),
    'has_openai_key', (openai_api_key IS NOT NULL AND openai_api_key <> ''),
    'wordpress_url', wordpress_url,
    'wordpress_username', wordpress_username
  )
  FROM public.user_settings
  WHERE user_id = auth.uid()
$function$;
