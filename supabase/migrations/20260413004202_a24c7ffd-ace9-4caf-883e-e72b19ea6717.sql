CREATE INDEX IF NOT EXISTS idx_articles_user_id_created_at ON public.articles (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_user_id ON public.trending_topics (user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);