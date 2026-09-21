
-- 1) Remove articles from realtime publication to stop broadcasting all users' article changes
ALTER PUBLICATION supabase_realtime DROP TABLE public.articles;

-- 2) Hide authors.user_id from anon/authenticated reads (column-level)
REVOKE SELECT (user_id) ON public.authors FROM anon, authenticated;

-- 3) Lock down online_users direct writes; mutations must go through SECURITY DEFINER RPC
REVOKE INSERT, UPDATE, DELETE ON public.online_users FROM anon, authenticated;
