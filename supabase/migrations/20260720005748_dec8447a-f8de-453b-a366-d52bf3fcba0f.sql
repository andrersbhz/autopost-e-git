
ALTER TABLE public.payment_methods_config
  ADD COLUMN IF NOT EXISTS stripe_enabled boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_public_payment_config();

CREATE OR REPLACE FUNCTION public.get_public_payment_config()
 RETURNS TABLE(pix_enabled boolean, pix_key text, pix_key_type text, pix_owner_name text, pix_bank text, mercadopago_enabled boolean, pagarme_enabled boolean, stripe_enabled boolean, admin_notify_email text, notify_admin_whatsapp_number text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pix_enabled, pix_key, pix_key_type, pix_owner_name, pix_bank,
         mercadopago_enabled, pagarme_enabled, stripe_enabled,
         admin_notify_email, notify_admin_whatsapp_number
  FROM public.payment_methods_config
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO anon, authenticated;
