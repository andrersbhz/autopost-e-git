
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS youtube_api_key text;

-- Update encryption trigger to include youtube_api_key
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
    IF NEW.groq_api_key IS NOT NULL AND NEW.groq_api_key != ''
       AND left(NEW.groq_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.groq_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.groq_api_key, enc_key), 'base64');
    END IF;
    IF NEW.azure_openai_api_key IS NOT NULL AND NEW.azure_openai_api_key != ''
       AND left(NEW.azure_openai_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.azure_openai_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.azure_openai_api_key, enc_key), 'base64');
    END IF;
    IF NEW.linkedin_access_token IS NOT NULL AND NEW.linkedin_access_token != ''
       AND left(NEW.linkedin_access_token, 10) != 'ENCRYPTED:' THEN
      NEW.linkedin_access_token := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.linkedin_access_token, enc_key), 'base64');
    END IF;
    IF NEW.google_indexing_key IS NOT NULL AND NEW.google_indexing_key != ''
       AND left(NEW.google_indexing_key, 10) != 'ENCRYPTED:' THEN
      NEW.google_indexing_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.google_indexing_key, enc_key), 'base64');
    END IF;
    IF NEW.youtube_api_key IS NOT NULL AND NEW.youtube_api_key != ''
       AND left(NEW.youtube_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.youtube_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.youtube_api_key, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update credentials status function
CREATE OR REPLACE FUNCTION public.get_credentials_status()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'has_wp_password', (wordpress_app_password IS NOT NULL AND wordpress_app_password <> ''),
    'has_fb_token', (facebook_access_token IS NOT NULL AND facebook_access_token <> ''),
    'has_gemini_key', (gemini_api_key IS NOT NULL AND gemini_api_key <> ''),
    'has_openai_key', (openai_api_key IS NOT NULL AND openai_api_key <> ''),
    'has_azure_key', (azure_openai_api_key IS NOT NULL AND azure_openai_api_key <> ''),
    'has_groq_key', (groq_api_key IS NOT NULL AND groq_api_key <> ''),
    'has_linkedin_token', (linkedin_access_token IS NOT NULL AND linkedin_access_token <> ''),
    'has_google_indexing_key', (google_indexing_key IS NOT NULL AND google_indexing_key <> ''),
    'has_youtube_key', (youtube_api_key IS NOT NULL AND youtube_api_key <> '')
  ) INTO result
  FROM public.user_settings
  WHERE user_id = auth.uid();

  RETURN COALESCE(result, json_build_object(
    'has_wp_password', false,
    'has_fb_token', false,
    'has_gemini_key', false,
    'has_openai_key', false,
    'has_azure_key', false,
    'has_groq_key', false,
    'has_linkedin_token', false,
    'has_google_indexing_key', false,
    'has_youtube_key', false
  ));
END;
$function$;
