-- Função para limpar tópicos antigos que não foram usados
CREATE OR REPLACE FUNCTION public.clean_old_trending_topics()
RETURNS void AS $$
BEGIN
  DELETE FROM public.trending_topics
  WHERE used = false 
  AND fetched_at < (now() - interval '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: O agendamento real via pg_cron requer extensões que podem não estar disponíveis 
-- dependendo do plano, mas garantimos a lógica de substituição no código da Edge Function.
