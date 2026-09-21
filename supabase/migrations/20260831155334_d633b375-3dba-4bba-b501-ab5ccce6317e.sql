DROP POLICY IF EXISTS nexa_profiles_select_self_or_orgmate ON public.nexa_profiles;
DROP POLICY IF EXISTS nexa_profiles_select_restricted ON public.nexa_profiles;

CREATE POLICY nexa_profiles_select_restricted ON public.nexa_profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.nexa_is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.nexa_organization_members m
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND public.nexa_has_org_role(auth.uid(), m.organization_id, ARRAY['org_admin']::public.nexa_role[])
      AND EXISTS (
        SELECT 1 FROM public.nexa_organization_members target
        WHERE target.user_id = nexa_profiles.id
          AND target.organization_id = m.organization_id
      )
  )
);

CREATE OR REPLACE VIEW public.nexa_profiles_public
WITH (security_barrier = true) AS
SELECT p.id, p.full_name, p.avatar_url
FROM public.nexa_profiles p
WHERE EXISTS (
  SELECT 1 FROM public.nexa_organization_members m
  JOIN public.nexa_organization_members t
    ON t.organization_id = m.organization_id AND t.user_id = p.id
  WHERE m.user_id = auth.uid() AND m.status = 'active'
);

GRANT SELECT ON public.nexa_profiles_public TO authenticated;