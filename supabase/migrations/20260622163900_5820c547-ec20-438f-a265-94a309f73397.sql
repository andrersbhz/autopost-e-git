
DROP POLICY IF EXISTS "Authenticated can read authors for public view" ON public.authors;
DROP VIEW IF EXISTS public.public_authors;

CREATE VIEW public.public_authors
WITH (security_invoker = false) AS
SELECT id, name, avatar_url, bio, role, category, created_at, updated_at
FROM public.authors;

REVOKE ALL ON public.public_authors FROM PUBLIC;
GRANT SELECT ON public.public_authors TO anon, authenticated;
REVOKE SELECT ON public.authors FROM anon;
