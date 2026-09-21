
-- Hide internal auth user_id from anonymous readers
REVOKE SELECT (user_id) ON public.articles FROM anon;
REVOKE SELECT (user_id) ON public.authors FROM anon;

-- Remove direct public read of raw online_users; aggregate RPCs (SECURITY DEFINER) remain available
DROP POLICY IF EXISTS "Public can view online users" ON public.online_users;
