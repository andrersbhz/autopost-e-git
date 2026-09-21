
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  brand_name text NOT NULL DEFAULT 'A3 Plataforma',
  brand_short text NOT NULL DEFAULT 'A3',
  tagline text NOT NULL DEFAULT 'Seu portal no piloto automático com o poder da IA',
  description text NOT NULL DEFAULT 'Publique 3 artigos por dia, distribua em Meta/Instagram, indexe no Google e escale seu tráfego sem contratar redatores.',
  logo_url text,
  favicon_url text,
  hero_video_url text DEFAULT 'https://cdn.pixabay.com/video/2023/10/26/186098-878428480_large.mp4',
  primary_color text NOT NULL DEFAULT '#a3ff12',
  accent_color text NOT NULL DEFAULT '#b57bff',
  contact_email text DEFAULT 'contato@a3plataforma.com',
  contact_phone text,
  cta_primary text NOT NULL DEFAULT 'Começar agora — 7 dias grátis',
  cta_secondary text NOT NULL DEFAULT 'Ver planos e preços',
  offer_badge text DEFAULT 'OFERTA DE LANÇAMENTO — apenas 47 vagas restantes',
  footer_text text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.platform_settings (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read platform settings" ON public.platform_settings;
CREATE POLICY "public read platform settings" ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "super admin update platform settings" ON public.platform_settings;
CREATE POLICY "super admin update platform settings" ON public.platform_settings
  FOR UPDATE TO authenticated USING (public.nexa_is_super_admin(auth.uid()))
  WITH CHECK (public.nexa_is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin insert platform settings" ON public.platform_settings;
CREATE POLICY "super admin insert platform settings" ON public.platform_settings
  FOR INSERT TO authenticated WITH CHECK (public.nexa_is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "brand assets public read" ON storage.objects;
CREATE POLICY "brand assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "brand assets super admin write" ON storage.objects;
CREATE POLICY "brand assets super admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND public.nexa_is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "brand assets super admin update" ON storage.objects;
CREATE POLICY "brand assets super admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.nexa_is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "brand assets super admin delete" ON storage.objects;
CREATE POLICY "brand assets super admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.nexa_is_super_admin(auth.uid()));
