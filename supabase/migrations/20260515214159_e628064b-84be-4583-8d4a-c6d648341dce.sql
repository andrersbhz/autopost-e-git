-- Função para limpar artigos publicados e tendências antigas
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- 1. Apagar artigos publicados (status = 'published')
    -- Nota: O usuário pediu para apagar "os postados"
    DELETE FROM public.articles 
    WHERE status = 'published';

    -- 2. Apagar tendências usadas ou com mais de 24h
    -- O usuário pediu: "apagar automaticamente os postados e as tendencias usadas as tendencias apagar por 24 horas apos o uso"
    -- Interpretando: Apagar tendências marcadas como 'used' OU tendências que foram buscadas há mais de 24h
    DELETE FROM public.trending_topics 
    WHERE used = true 
       OR fetched_at < (now() - interval '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar a execução a cada hora usando pg_cron (se disponível no Supabase)
-- Se pg_cron não estiver ativo, a função pode ser chamada via Edge Function
SELECT cron.schedule('cleanup-expired-data-job', '0 * * * *', 'SELECT public.cleanup_expired_data()');
