CREATE TABLE public.user_blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    wordpress_url TEXT NOT NULL,
    wordpress_username TEXT NOT NULL,
    wordpress_app_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_blogs TO authenticated;
GRANT ALL ON public.user_blogs TO service_role;

ALTER TABLE public.user_blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blogs"
ON public.user_blogs
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Add blog_id to articles to link posts to specific blogs
ALTER TABLE public.articles ADD COLUMN blog_id UUID REFERENCES public.user_blogs(id) ON DELETE SET NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
