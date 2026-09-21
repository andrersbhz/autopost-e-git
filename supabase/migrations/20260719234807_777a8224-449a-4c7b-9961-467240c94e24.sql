DROP FUNCTION IF EXISTS public.get_public_payment_config();

CREATE OR REPLACE FUNCTION public.get_public_payment_config()
RETURNS TABLE (
  pix_enabled boolean,
  pix_key text,
  pix_key_type text,
  pix_owner_name text,
  pix_bank text,
  mercadopago_enabled boolean,
  pagarme_enabled boolean,
  admin_notify_email text,
  notify_admin_whatsapp_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pix_enabled, pix_key, pix_key_type, pix_owner_name, pix_bank,
         mercadopago_enabled, pagarme_enabled,
         admin_notify_email, notify_admin_whatsapp_number
  FROM public.payment_methods_config
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_payment_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO anon, authenticated;