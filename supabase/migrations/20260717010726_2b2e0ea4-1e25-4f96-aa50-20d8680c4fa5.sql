
-- Fase 1+5 schema tweaks
ALTER TABLE public.license_keys ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.license_keys ADD COLUMN IF NOT EXISTS mp_subscription_id text;
CREATE INDEX IF NOT EXISTS idx_license_keys_stripe_sub ON public.license_keys(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_mp_sub ON public.license_keys(mp_subscription_id);

ALTER TABLE public.sale_notifications ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.sale_notifications ADD COLUMN IF NOT EXISTS mp_payment_id text;

ALTER TABLE public.payment_methods_config ADD COLUMN IF NOT EXISTS mp_webhook_secret text;
ALTER TABLE public.payment_methods_config ADD COLUMN IF NOT EXISTS notify_email_customer boolean DEFAULT true;
ALTER TABLE public.payment_methods_config ADD COLUMN IF NOT EXISTS notify_email_admin boolean DEFAULT true;
ALTER TABLE public.payment_methods_config ADD COLUMN IF NOT EXISTS notify_whatsapp_admin boolean DEFAULT false;
ALTER TABLE public.payment_methods_config ADD COLUMN IF NOT EXISTS notify_admin_whatsapp_number text;

-- Ensure subscriptions has environment column (per stripe-webhooks pattern)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS license_id uuid REFERENCES public.license_keys(id) ON DELETE SET NULL;

-- Function to create a license + sale notification after a paid checkout
CREATE OR REPLACE FUNCTION public.create_license_after_payment(
  p_buyer_email text,
  p_buyer_name text,
  p_buyer_phone text,
  p_plan text,
  p_amount_cents integer,
  p_currency text,
  p_payment_method text,
  p_period_days integer DEFAULT 30,
  p_stripe_subscription_id text DEFAULT NULL,
  p_stripe_session_id text DEFAULT NULL,
  p_mp_payment_id text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_license_id uuid;
  v_sale_id uuid;
BEGIN
  -- Idempotency: if a license already exists for this stripe sub, return it
  IF p_stripe_subscription_id IS NOT NULL THEN
    SELECT id, license_key INTO v_license_id, v_key
    FROM public.license_keys WHERE stripe_subscription_id = p_stripe_subscription_id LIMIT 1;
    IF v_license_id IS NOT NULL THEN
      RETURN json_build_object('ok', true, 'license_id', v_license_id, 'license_key', v_key, 'reused', true);
    END IF;
  END IF;

  v_key := public.generate_license_key();

  INSERT INTO public.license_keys (license_key, plan, status, expires_at, activated_at, stripe_subscription_id)
  VALUES (v_key, p_plan, 'active', now() + (p_period_days || ' days')::interval, now(), p_stripe_subscription_id)
  RETURNING id INTO v_license_id;

  INSERT INTO public.sale_notifications (
    buyer_email, buyer_name, buyer_phone, plan, amount_cents, currency,
    payment_method, status, license_id, stripe_session_id, mp_payment_id
  )
  VALUES (
    p_buyer_email, p_buyer_name, p_buyer_phone, p_plan, p_amount_cents, COALESCE(p_currency,'brl'),
    p_payment_method, 'paid', v_license_id, p_stripe_session_id, p_mp_payment_id
  )
  RETURNING id INTO v_sale_id;

  RETURN json_build_object('ok', true, 'license_id', v_license_id, 'license_key', v_key, 'sale_id', v_sale_id, 'reused', false);
END;
$$;

-- Function to revoke a license linked to a canceled subscription
CREATE OR REPLACE FUNCTION public.revoke_license_by_subscription(p_stripe_subscription_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.license_keys SET status = 'expired' WHERE stripe_subscription_id = p_stripe_subscription_id;
  UPDATE public.license_sessions SET is_active = false, ended_at = now(), ended_reason = 'subscription_canceled'
   WHERE license_id IN (SELECT id FROM public.license_keys WHERE stripe_subscription_id = p_stripe_subscription_id) AND is_active = true;
END; $$;

-- Extend license (renewal)
CREATE OR REPLACE FUNCTION public.extend_license_by_subscription(p_stripe_subscription_id text, p_period_days integer DEFAULT 30)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.license_keys
    SET expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (p_period_days || ' days')::interval,
        status = 'active'
    WHERE stripe_subscription_id = p_stripe_subscription_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_license_after_payment(text,text,text,text,integer,text,text,integer,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_license_by_subscription(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.extend_license_by_subscription(text,integer) TO service_role;
