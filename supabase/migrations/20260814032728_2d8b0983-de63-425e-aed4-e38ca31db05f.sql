-- Allow admins to see all articles, blogs, etc.
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can see all articles" ON public.articles;
    CREATE POLICY "Admins can see all articles" ON public.articles
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can see all blogs" ON public.user_blogs;
    CREATE POLICY "Admins can see all blogs" ON public.user_blogs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can see all sales" ON public.sales;
    CREATE POLICY "Admins can see all sales" ON public.sales
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can see all user_settings" ON public.user_settings;
    CREATE POLICY "Admins can see all user_settings" ON public.user_settings
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;
