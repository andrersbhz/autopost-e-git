
-- Drop and recreate decrypt to accept key parameter
DROP FUNCTION IF EXISTS public.decrypt_credential(text);

CREATE OR REPLACE FUNCTION public.decrypt_credential(val text, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF val IS NULL OR val = '' THEN RETURN val; END IF;
  IF left(val, 10) != 'ENCRYPTED:' THEN RETURN val; END IF;
  IF enc_key IS NULL OR enc_key = '' THEN RETURN val; END IF;
  RETURN pgp_sym_decrypt(decode(substring(val from 11), 'base64'), enc_key);
END;
$$;

-- Revoke from public roles
REVOKE EXECUTE ON FUNCTION public.decrypt_credential(text, text) FROM authenticated, anon;
