DROP POLICY IF EXISTS "Public can read safe author columns" ON public.authors;
REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, name, avatar_url, bio, role, category, created_at, updated_at) ON public.authors TO anon;
CREATE POLICY "Public can read safe author columns" ON public.authors FOR SELECT TO anon USING (true);