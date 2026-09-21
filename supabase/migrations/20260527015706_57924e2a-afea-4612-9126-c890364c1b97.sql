DROP VIEW IF EXISTS public.public_articles;

CREATE VIEW public.public_articles
WITH (security_invoker = true)
AS
SELECT
  id, title, content, excerpt, category, slug, seo_title, seo_keyword,
  meta_title, meta_description, focus_keyword, featured_image_url,
  image_alt, image_caption, visual_elements, author_id, trending_topic,
  ai_provider, published_at, scheduled_at, created_at, updated_at,
  status, wordpress_post_id
FROM public.articles
WHERE status = 'published';

GRANT SELECT ON public.public_articles TO anon, authenticated;

-- Re-add a column-scoped public SELECT policy on articles so the security_invoker view works for anon
CREATE POLICY "Published articles readable for view"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- But that re-exposes user_id. Restrict anon column access on articles instead.
REVOKE SELECT (user_id) ON public.articles FROM anon;