-- 1) Storage: restrict article-images update/delete to authenticated role
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2) nexa_profiles: only self, super admins and org_admins may read full profile (incl. phone)
DROP POLICY IF EXISTS nexa_profiles_select_self_or_orgmate ON public.nexa_profiles;

CREATE POLICY nexa_profiles_select_self_or_orgmate
ON public.nexa_profiles FOR SELECT TO authenticated
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
      AND m1.role = 'org_admin'::nexa_role
  )
);

-- 3) _internal_config: revoke all Data API access (fail-closed, definer functions only)
REVOKE ALL ON public._internal_config FROM anon, authenticated;
GRANT ALL ON public._internal_config TO service_role;
