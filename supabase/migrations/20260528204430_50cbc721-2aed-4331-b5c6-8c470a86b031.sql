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
    'has_google_indexing_key', (google_indexing_key IS NOT NULL AND google_indexing_key <> '')
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
    'has_google_indexing_key', false
  ));
END;
$function$;
