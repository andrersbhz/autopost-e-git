-- Fix: restrict payment_methods_config exposure
DROP POLICY IF EXISTS anyone_read_payment_config ON public.payment_methods_config;

-- Public RPC returning only non-sensitive fields needed by checkout UI
CREATE OR REPLACE FUNCTION public.get_public_payment_config()
RETURNS TABLE (
  pix_enabled boolean,
  pix_key text,
  pix_key_type text,
  pix_owner_name text,
  pix_bank text,
  mercadopago_enabled boolean,
  pagarme_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pix_enabled, pix_key, pix_key_type, pix_owner_name, pix_bank,
         mercadopago_enabled, pagarme_enabled
  FROM public.payment_methods_config
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_payment_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO anon, authenticated;

-- Fix: set immutable search_path on generate_license_key
CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'NEXA';
  i INT;
  j INT;
BEGIN
  FOR j IN 1..4 LOOP
    result := result || '-';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random()*length(chars))::int + 1, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$function$;