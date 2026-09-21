
REVOKE EXECUTE ON FUNCTION public.create_license_after_payment(text,text,text,text,integer,text,text,integer,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_license_by_subscription(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.extend_license_by_subscription(text,integer) FROM PUBLIC, anon, authenticated;
