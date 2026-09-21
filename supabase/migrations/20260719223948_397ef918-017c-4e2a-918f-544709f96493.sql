
-- Manual Pix flow enhancements

-- 1) Extend sale_notifications
ALTER TABLE public.sale_notifications
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS admin_note text;

-- Rebuild status check to include awaiting_confirmation
ALTER TABLE public.sale_notifications DROP CONSTRAINT IF EXISTS sale_notifications_status_check;
ALTER TABLE public.sale_notifications
  ADD CONSTRAINT sale_notifications_status_check
  CHECK (status = ANY (ARRAY['pending','awaiting_confirmation','paid','delivered','cancelled']));

-- 2) Storage policies for payment-proofs (private bucket)
-- Allow anon + authenticated to upload into this bucket (submit proof at checkout without login)
DROP POLICY IF EXISTS "payment_proofs_public_insert" ON storage.objects;
CREATE POLICY "payment_proofs_public_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Only super_admin can read/list the proofs
DROP POLICY IF EXISTS "payment_proofs_admin_read" ON storage.objects;
CREATE POLICY "payment_proofs_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.nexa_is_super_admin(auth.uid()));

-- 3) RPC: attach proof to a sale (public — buyer is not logged in)
CREATE OR REPLACE FUNCTION public.attach_pix_proof(p_sale_id uuid, p_proof_url text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.sale_notifications%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.sale_notifications WHERE id = p_sale_id;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_row.status NOT IN ('pending','awaiting_confirmation') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;
  UPDATE public.sale_notifications
    SET proof_url = p_proof_url,
        status = 'awaiting_confirmation',
        updated_at = now()
    WHERE id = p_sale_id;
  RETURN json_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.attach_pix_proof(uuid, text) TO anon, authenticated;

-- 4) RPC: admin confirms a manual Pix sale -> generates license, returns key
CREATE OR REPLACE FUNCTION public.admin_confirm_pix_sale(p_sale_id uuid, p_period_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale public.sale_notifications%ROWTYPE;
  v_key text;
  v_license_id uuid;
BEGIN
  IF NOT public.nexa_is_super_admin(auth.uid()) THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_sale FROM public.sale_notifications WHERE id = p_sale_id;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'not_found'); END IF;

  -- Idempotent: if license already exists, reuse it
  IF v_sale.license_id IS NOT NULL THEN
    SELECT license_key INTO v_key FROM public.license_keys WHERE id = v_sale.license_id;
    UPDATE public.sale_notifications SET status = 'paid', updated_at = now() WHERE id = p_sale_id AND status <> 'delivered';
    RETURN json_build_object('ok', true, 'license_key', v_key, 'reused', true);
  END IF;

  v_key := public.generate_license_key();

  INSERT INTO public.license_keys (license_key, plan, status, activated_at, expires_at, notes)
  VALUES (v_key, COALESCE(v_sale.plan, 'starter_monthly'), 'active', now(),
          now() + (p_period_days || ' days')::interval,
          'Pix manual — venda ' || v_sale.id::text)
  RETURNING id INTO v_license_id;

  UPDATE public.sale_notifications
    SET license_id = v_license_id, status = 'paid', updated_at = now()
    WHERE id = p_sale_id;

  RETURN json_build_object('ok', true, 'license_key', v_key, 'license_id', v_license_id, 'reused', false);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_confirm_pix_sale(uuid, integer) TO authenticated;
