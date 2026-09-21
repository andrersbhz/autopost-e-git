-- Permitir visualização pública de artigos publicados
CREATE POLICY "Published articles are publicly viewable" 
ON public.articles 
FOR SELECT 
USING (status = 'published');

-- Permitir que autores sejam vistos publicamente (já existe mas garantindo)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'authors' AND policyname = 'Authors are publicly viewable'
    ) THEN
        CREATE POLICY "Authors are publicly viewable" ON public.authors FOR SELECT USING (true);
    END IF;
END $$;
