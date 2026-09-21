GRANT SELECT ON public.articles TO anon, authenticated;
GRANT SELECT ON public.public_articles TO anon, authenticated;
GRANT SELECT ON public.authors TO anon, authenticated;

-- Ensure RLS is active and allows reading published articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'articles' AND policyname = 'Allow public read of published articles'
    ) THEN
        CREATE POLICY "Allow public read of published articles" ON public.articles
        FOR SELECT TO anon, authenticated
        USING (status = 'published');
    END IF;
END $$;
