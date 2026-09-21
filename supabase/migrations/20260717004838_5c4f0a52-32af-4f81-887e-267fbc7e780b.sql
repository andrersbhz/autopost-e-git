-- ============ payment_methods_config (singleton) ============
CREATE TABLE public.payment_methods_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  pix_enabled BOOLEAN NOT NULL DEFAULT false,
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf','cnpj','email','phone','random')),
  pix_owner_name TEXT,
  pix_owner_document TEXT,
  pix_bank TEXT,
  mercadopago_enabled BOOLEAN NOT NULL DEFAULT false,
  mercadopago_public_key TEXT,
  mercadopago_access_token TEXT,
  pagarme_enabled BOOLEAN NOT NULL DEFAULT false,
  pagarme_api_key TEXT,
  admin_notify_email TEXT,
  admin_notify_phone TEXT,
  admin_notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods_config TO authenticated;
GRANT ALL ON public.payment_methods_config TO service_role;

ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_payment_config" ON public.payment_methods_config
  FOR ALL TO authenticated
  USING (public.nexa_is_super_admin(auth.uid()))
  WITH CHECK (public.nexa_is_super_admin(auth.uid()));

-- Public read of enabled methods only (via view below)
CREATE OR REPLACE VIEW public.payment_methods_public AS
  SELECT pix_enabled, pix_key, pix_key_type, pix_owner_name, pix_bank,
         mercadopago_enabled, mercadopago_public_key,
         pagarme_enabled
  FROM public.payment_methods_config
  LIMIT 1;

GRANT SELECT ON public.payment_methods_public TO anon, authenticated;

CREATE TRIGGER payment_methods_config_updated
  BEFORE UPDATE ON public.payment_methods_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed singleton row
INSERT INTO public.payment_methods_config (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- ============ license_keys ============
CREATE TABLE public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','expired','revoked')),
  current_session_id UUID,
  current_ip TEXT,
  current_user_agent TEXT,
  last_login_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_license_keys_user ON public.license_keys(user_id);
CREATE INDEX idx_license_keys_status ON public.license_keys(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_keys TO authenticated;
GRANT ALL ON public.license_keys TO service_role;

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_license" ON public.license_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.nexa_is_super_admin(auth.uid()));

CREATE POLICY "super_admin_manage_licenses" ON public.license_keys
  FOR ALL TO authenticated
  USING (public.nexa_is_super_admin(auth.uid()))
  WITH CHECK (public.nexa_is_super_admin(auth.uid()));

CREATE TRIGGER license_keys_updated
  BEFORE UPDATE ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ license_sessions ============
CREATE TABLE public.license_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.license_keys(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_reason TEXT
);

CREATE INDEX idx_license_sessions_license ON public.license_sessions(license_id);
CREATE INDEX idx_license_sessions_active ON public.license_sessions(license_id, is_active);

GRANT SELECT, INSERT, UPDATE ON public.license_sessions TO authenticated;
GRANT ALL ON public.license_sessions TO service_role;

ALTER TABLE public.license_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_sessions" ON public.license_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.license_keys lk WHERE lk.id = license_id AND (lk.user_id = auth.uid() OR public.nexa_is_super_admin(auth.uid())))
  );

CREATE POLICY "super_admin_manage_sessions" ON public.license_sessions
  FOR ALL TO authenticated
  USING (public.nexa_is_super_admin(auth.uid()))
  WITH CHECK (public.nexa_is_super_admin(auth.uid()));

-- ============ sale_notifications ============
CREATE TABLE public.sale_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  plan TEXT NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','delivered','cancelled')),
  license_id UUID REFERENCES public.license_keys(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_notifications_status ON public.sale_notifications(status);
CREATE INDEX idx_sale_notifications_created ON public.sale_notifications(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.sale_notifications TO authenticated;
GRANT ALL ON public.sale_notifications TO service_role;

ALTER TABLE public.sale_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_notifications" ON public.sale_notifications
  FOR ALL TO authenticated
  USING (public.nexa_is_super_admin(auth.uid()))
  WITH CHECK (public.nexa_is_super_admin(auth.uid()));

-- Allow anonymous checkout to create a pending notification
CREATE POLICY "anyone_insert_sale_notification" ON public.sale_notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

GRANT INSERT ON public.sale_notifications TO anon;

CREATE TRIGGER sale_notifications_updated
  BEFORE UPDATE ON public.sale_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Functions ============

-- Generate license key formatted NEXA-XXXX-XXXX-XXXX-XXXX
CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;

-- Activate license and rotate active session (deactivates any prior session)
CREATE OR REPLACE FUNCTION public.activate_license_session(
  p_license_key TEXT,
  p_ip TEXT,
  p_user_agent TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license public.license_keys%ROWTYPE;
  v_new_token TEXT;
  v_new_session_id UUID;
BEGIN
  SELECT * INTO v_license FROM public.license_keys
  WHERE license_key = p_license_key
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_key');
  END IF;

  IF v_license.status = 'revoked' OR v_license.status = 'expired' THEN
    RETURN json_build_object('ok', false, 'error', v_license.status);
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at < now() THEN
    UPDATE public.license_keys SET status = 'expired' WHERE id = v_license.id;
    RETURN json_build_object('ok', false, 'error', 'expired');
  END IF;

  -- End any previous active sessions for this license
  UPDATE public.license_sessions
    SET is_active = false, ended_at = now(), ended_reason = 'new_login'
    WHERE license_id = v_license.id AND is_active = true;

  v_new_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.license_sessions (license_id, session_token, ip, user_agent, is_active)
  VALUES (v_license.id, v_new_token, p_ip, p_user_agent, true)
  RETURNING id INTO v_new_session_id;

  UPDATE public.license_keys
    SET current_session_id = v_new_session_id,
        current_ip = p_ip,
        current_user_agent = p_user_agent,
        last_login_at = now(),
        status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
        activated_at = COALESCE(activated_at, now())
    WHERE id = v_license.id;

  RETURN json_build_object(
    'ok', true,
    'license_id', v_license.id,
    'session_token', v_new_token,
    'plan', v_license.plan,
    'expires_at', v_license.expires_at
  );
END;
$$;

-- Validate current session (returns whether this token is still active)
CREATE OR REPLACE FUNCTION public.validate_license_session(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT s.*, l.status AS license_status, l.plan, l.expires_at AS license_expires
  INTO v_row
  FROM public.license_sessions s
  JOIN public.license_keys l ON l.id = s.license_id
  WHERE s.session_token = p_session_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_session');
  END IF;

  IF NOT v_row.is_active THEN
    RETURN json_build_object('ok', false, 'error', 'kicked', 'reason', v_row.ended_reason);
  END IF;

  IF v_row.license_status <> 'active' THEN
    RETURN json_build_object('ok', false, 'error', v_row.license_status);
  END IF;

  RETURN json_build_object('ok', true, 'plan', v_row.plan, 'expires_at', v_row.license_expires);
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_license_session(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_license_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_license_key() TO authenticated, service_role;