-- Fix decrypt_credential to always use the same key as the encryption trigger
CREATE OR REPLACE FUNCTION public.decrypt_credential(val text, enc_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actual_key text;
BEGIN
  IF val IS NULL OR val = '' THEN RETURN val; END IF;
  IF left(val, 10) != 'ENCRYPTED:' THEN RETURN val; END IF;
  
  -- Always use the internal config key (same one used by encryption triggers)
  SELECT value INTO actual_key FROM public._internal_config WHERE key = 'encryption_key';
  
  IF actual_key IS NULL OR actual_key = '' THEN
    -- Fallback to provided key
    actual_key := enc_key;
  END IF;
  
  IF actual_key IS NULL OR actual_key = '' THEN RETURN val; END IF;
  
  RETURN extensions.pgp_sym_decrypt(decode(substring(val from 11), 'base64'), actual_key);
END;
$function$;
