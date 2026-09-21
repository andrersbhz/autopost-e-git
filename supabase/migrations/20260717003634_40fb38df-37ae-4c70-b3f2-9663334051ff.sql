
INSERT INTO public.nexa_organizations (id, name, slug, segment, plan, status)
VALUES (gen_random_uuid(), 'A3 Plataforma', 'a3-plataforma', 'other', 'enterprise', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.nexa_organization_members (organization_id, user_id, role, status)
SELECT o.id, u.id, 'super_admin'::nexa_role, 'active'
FROM public.nexa_organizations o
CROSS JOIN auth.users u
WHERE o.slug = 'a3-plataforma'
  AND u.id IN ('1c45fe95-636f-4118-a4b6-1f36e2c69c8e','ade4dcfb-33bc-428f-acf5-f198af4816b3')
ON CONFLICT (user_id, organization_id) DO UPDATE SET role='super_admin', status='active';

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');
