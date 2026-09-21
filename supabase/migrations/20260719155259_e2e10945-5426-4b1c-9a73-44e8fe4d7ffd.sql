
-- Fix 1: audit_logs INSERT policy for authenticated users on their own rows
CREATE POLICY "Users can insert their own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix 2: RPC to safely check sale/license status after checkout (public callable, minimal exposure)
CREATE OR REPLACE FUNCTION public.check_sale_status(
  p_mp_payment_id text DEFAULT NULL,
  p_stripe_session_id text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF p_mp_payment_id IS NULL AND p_stripe_session_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'missing_id');
  END IF;

  SELECT s.id, s.status, l.license_key
  INTO v_row
  FROM public.sale_notifications s
  LEFT JOIN public.license_keys l ON l.id = s.license_id
  WHERE (p_mp_payment_id IS NOT NULL AND s.mp_payment_id = p_mp_payment_id)
     OR (p_stripe_session_id IS NOT NULL AND s.stripe_session_id = p_stripe_session_id)
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'found', false);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'found', true,
    'sale_id', v_row.id,
    'status', v_row.status,
    'license_key', v_row.license_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_sale_status(text, text) TO anon, authenticated;
