
-- 1) visitor_history: restrict SELECT to own rows; remove permissive INSERT policy (RPC is SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated can read visitor history" ON public.visitor_history;
DROP POLICY IF EXISTS "Anyone can insert visitor history" ON public.visitor_history;

REVOKE INSERT ON public.visitor_history FROM anon, authenticated;
REVOKE SELECT ON public.visitor_history FROM authenticated;

CREATE POLICY "Users read their own visitor history"
  ON public.visitor_history FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

GRANT SELECT ON public.visitor_history TO authenticated;

-- 2) authors: hide user_id from anonymous viewers via column-level privileges
REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, name, role, bio, avatar_url, category, created_at, updated_at)
  ON public.authors TO anon;
