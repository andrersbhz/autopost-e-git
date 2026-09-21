-- Adicionar índices para acelerar o Dashboard
CREATE INDEX IF NOT EXISTS idx_publish_log_user_id_status ON public.publish_log(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_user_id_used_fetched_at ON public.trending_topics(user_id, used, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_id_status_category ON public.articles(user_id, status, category);