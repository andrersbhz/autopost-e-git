-- Add google_indexing_key column to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS google_indexing_key text;

-- Update encryption trigger to also encrypt google_indexing_key
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
    -- WordPress
    IF NEW.wordpress_app_password IS NOT NULL AND NEW.wordpress_app_password != ''
       AND left(NEW.wordpress_app_password, 10) != 'ENCRYPTED:' THEN
      NEW.wordpress_app_password := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.wordpress_app_password, enc_key), 'base64');
    END IF;
    
    -- Facebook
    IF NEW.facebook_access_token IS NOT NULL AND NEW.facebook_access_token != ''
       AND left(NEW.facebook_access_token, 10) != 'ENCRYPTED:' THEN
      NEW.facebook_access_token := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.facebook_access_token, enc_key), 'base64');
    END IF;

    -- Gemini
    IF NEW.gemini_api_key IS NOT NULL AND NEW.gemini_api_key != ''
       AND left(NEW.gemini_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.gemini_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.gemini_api_key, enc_key), 'base64');
    END IF;

    -- OpenAI
    IF NEW.openai_api_key IS NOT NULL AND NEW.openai_api_key != ''
       AND left(NEW.openai_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.openai_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.openai_api_key, enc_key), 'base64');
    END IF;

    -- Groq
    IF NEW.groq_api_key IS NOT NULL AND NEW.groq_api_key != ''
       AND left(NEW.groq_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.groq_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.groq_api_key, enc_key), 'base64');
    END IF;

    -- Azure OpenAI
    IF NEW.azure_openai_api_key IS NOT NULL AND NEW.azure_openai_api_key != ''
       AND left(NEW.azure_openai_api_key, 10) != 'ENCRYPTED:' THEN
      NEW.azure_openai_api_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.azure_openai_api_key, enc_key), 'base64');
    END IF;

    -- LinkedIn
    IF NEW.linkedin_access_token IS NOT NULL AND NEW.linkedin_access_token != ''
       AND left(NEW.linkedin_access_token, 10) != 'ENCRYPTED:' THEN
      NEW.linkedin_access_token := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.linkedin_access_token, enc_key), 'base64');
    END IF;

    -- Google Indexing
    IF NEW.google_indexing_key IS NOT NULL AND NEW.google_indexing_key != ''
       AND left(NEW.google_indexing_key, 10) != 'ENCRYPTED:' THEN
      NEW.google_indexing_key := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.google_indexing_key, enc_key), 'base64');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Revoke direct select on google_indexing_key
REVOKE SELECT (google_indexing_key) ON public.user_settings FROM authenticated, anon;
