
DROP VIEW IF EXISTS public.public_authors;

CREATE VIEW public.public_authors
WITH (security_invoker = true) AS
SELECT id, name, avatar_url, bio, role, category, created_at, updated_at
FROM public.authors;

GRANT SELECT ON public.public_authors TO anon, authenticated;

REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, name, avatar_url, bio, role, category, created_at, updated_at)
ON public.authors TO anon;

CREATE POLICY "Public can read safe author columns"
ON public.authors
FOR SELECT
TO anon
USING (true);
