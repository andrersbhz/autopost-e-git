DROP VIEW IF EXISTS public.payment_methods_public;

CREATE VIEW public.payment_methods_public
WITH (security_invoker = true) AS
  SELECT pix_enabled, pix_key, pix_key_type, pix_owner_name, pix_bank,
         mercadopago_enabled, mercadopago_public_key,
         pagarme_enabled
  FROM public.payment_methods_config
  LIMIT 1;

GRANT SELECT ON public.payment_methods_public TO anon, authenticated;

-- Allow anon/authenticated to read the singleton row of the underlying table
-- (only non-sensitive fields are exposed via the view; but RLS needs a SELECT policy)
CREATE POLICY "anyone_read_payment_config" ON public.payment_methods_config
  FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.payment_methods_config TO anon;