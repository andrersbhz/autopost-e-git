REVOKE EXECUTE ON FUNCTION public.nexa_is_super_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nexa_is_org_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nexa_has_org_role(UUID, UUID, public.nexa_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nexa_user_org_ids(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nexa_handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nexa_set_updated_at() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.nexa_is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexa_is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexa_has_org_role(UUID, UUID, public.nexa_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexa_user_org_ids(UUID) TO authenticated;