REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, name, avatar_url, bio, role, category, created_at, updated_at) ON public.authors TO anon;