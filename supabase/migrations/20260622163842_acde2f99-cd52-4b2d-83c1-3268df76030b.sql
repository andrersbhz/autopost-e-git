
DROP POLICY IF EXISTS "Authors are publicly viewable" ON public.authors;
REVOKE SELECT ON public.authors FROM anon;

CREATE OR REPLACE VIEW public.public_authors
WITH (security_invoker = true) AS
SELECT id, name, avatar_url, bio, role, category, created_at, updated_at
FROM public.authors;

GRANT SELECT ON public.public_authors TO anon, authenticated;

CREATE POLICY "Authenticated can read authors for public view"
ON public.authors
FOR SELECT
TO anon, authenticated
USING (true);
