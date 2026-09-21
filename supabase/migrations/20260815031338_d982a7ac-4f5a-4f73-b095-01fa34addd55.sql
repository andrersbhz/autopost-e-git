-- 1) search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 2) sale_notifications: remove public insert, add validated RPC
DROP POLICY IF EXISTS anyone_insert_sale_notification ON public.sale_notifications;

CREATE OR REPLACE FUNCTION public.create_pending_sale(
  p_buyer_email text,
  p_buyer_name text,
  p_buyer_phone text,
  p_plan text,
  p_amount_cents integer,
  p_payment_method text DEFAULT 'pix_manual',
  p_reference text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_buyer_email IS NULL OR p_buyer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF coalesce(trim(p_plan),'') = '' OR length(p_plan) > 60 THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents < 100 OR p_amount_cents > 5000000 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_payment_method NOT IN ('pix_manual','pix') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  INSERT INTO public.sale_notifications (
    buyer_email, buyer_name, buyer_phone, plan, amount_cents, currency,
    payment_method, status, mp_payment_id, metadata
  ) VALUES (
    left(trim(p_buyer_email), 200),
    left(coalesce(trim(p_buyer_name),''), 120),
    left(coalesce(regexp_replace(coalesce(p_buyer_phone,''), '\D', '', 'g'),''), 20),
    trim(p_plan),
    p_amount_cents,
    'BRL',
    p_payment_method,
    'pending',
    left(coalesce(p_reference,''), 120),
    coalesce(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_sale(text,text,text,text,integer,text,text,jsonb) TO anon, authenticated;

-- 3) payment-proofs storage: only into folders of existing pending sales
CREATE OR REPLACE FUNCTION public.is_open_sale_folder(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  BEGIN
    v_id := (split_part(p_name, '/', 1))::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN EXISTS (
    SELECT 1 FROM public.sale_notifications
    WHERE id = v_id
      AND status IN ('pending','awaiting_confirmation')
      AND created_at > now() - interval '2 days'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_open_sale_folder(text) TO anon, authenticated;

DROP POLICY IF EXISTS payment_proofs_public_insert ON storage.objects;
CREATE POLICY payment_proofs_scoped_insert ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND array_length(string_to_array(name, '/'), 1) = 2
  AND public.is_open_sale_folder(name)
);

-- 4) nexa_profiles: hide phone from ordinary org mates
DROP POLICY IF EXISTS nexa_profiles_select_self_or_orgmate ON public.nexa_profiles;
CREATE POLICY nexa_profiles_select_self_or_orgmate ON public.nexa_profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.nexa_is_super_admin(auth.uid())
  OR (
    phone IS NULL
    AND EXISTS (
      SELECT 1 FROM public.nexa_organization_members m1
      JOIN public.nexa_organization_members m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = nexa_profiles.id
        AND m1.status = 'active' AND m2.status = 'active'
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.nexa_organization_members m1
    JOIN public.nexa_organization_members m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = nexa_profiles.id
      AND m1.status = 'active' AND m2.status = 'active'
      AND m1.role IN ('org_admin','manager')
  )
);
