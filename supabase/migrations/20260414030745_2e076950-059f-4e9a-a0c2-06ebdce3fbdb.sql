
-- Add groq_api_key column
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS groq_api_key text;

-- Revoke select on the new column from anon and authenticated
REVOKE SELECT (groq_api_key) ON public.user_settings FROM anon, authenticated;

-- Recreate get_credentials_status to include groq
CREATE OR REPLACE FUNCTION public.get_credentials_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'has_wp_password', (wordpress_app_password IS NOT NULL AND wordpress_app_password <> ''),
    'has_fb_token', (facebook_access_token IS NOT NULL AND facebook_access_token <> ''),
    'has_gemini_key', (gemini_api_key IS NOT NULL AND gemini_api_key <> ''),
    'has_openai_key', (openai_api_key IS NOT NULL AND openai_api_key <> ''),
    'has_groq_key', (groq_api_key IS NOT NULL AND groq_api_key <> '')
  ) INTO result
  FROM public.user_settings
  WHERE user_id = auth.uid();

  RETURN COALESCE(result, json_build_object(
    'has_wp_password', false,
    'has_fb_token', false,
    'has_gemini_key', false,
    'has_openai_key', false,
    'has_groq_key', false
  ));
END;
$$;

-- Update the encrypt trigger function to handle groq_api_key
CREATE OR REPLACE FUNCTION public.encrypt_user_settings_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wordpress_app_password IS NOT NULL AND NEW.wordpress_app_password <> '' AND (NEW.wordpress_app_password IS DISTINCT FROM OLD.wordpress_app_password OR OLD IS NULL) AND NOT starts_with(COALESCE(NEW.wordpress_app_password,''), 'ENCRYPTED:') THEN
    NEW.wordpress_app_password := public.encrypt_credential(NEW.wordpress_app_password);
  END IF;
  IF NEW.facebook_access_token IS NOT NULL AND NEW.facebook_access_token <> '' AND (NEW.facebook_access_token IS DISTINCT FROM OLD.facebook_access_token OR OLD IS NULL) AND NOT starts_with(COALESCE(NEW.facebook_access_token,''), 'ENCRYPTED:') THEN
    NEW.facebook_access_token := public.encrypt_credential(NEW.facebook_access_token);
  END IF;
  IF NEW.gemini_api_key IS NOT NULL AND NEW.gemini_api_key <> '' AND (NEW.gemini_api_key IS DISTINCT FROM OLD.gemini_api_key OR OLD IS NULL) AND NOT starts_with(COALESCE(NEW.gemini_api_key,''), 'ENCRYPTED:') THEN
    NEW.gemini_api_key := public.encrypt_credential(NEW.gemini_api_key);
  END IF;
  IF NEW.openai_api_key IS NOT NULL AND NEW.openai_api_key <> '' AND (NEW.openai_api_key IS DISTINCT FROM OLD.openai_api_key OR OLD IS NULL) AND NOT starts_with(COALESCE(NEW.openai_api_key,''), 'ENCRYPTED:') THEN
    NEW.openai_api_key := public.encrypt_credential(NEW.openai_api_key);
  END IF;
  IF NEW.groq_api_key IS NOT NULL AND NEW.groq_api_key <> '' AND (NEW.groq_api_key IS DISTINCT FROM OLD.groq_api_key OR OLD IS NULL) AND NOT starts_with(COALESCE(NEW.groq_api_key,''), 'ENCRYPTED:') THEN
    NEW.groq_api_key := public.encrypt_credential(NEW.groq_api_key);
  END IF;
  RETURN NEW;
END;
$$;
