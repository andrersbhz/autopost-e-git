-- Atualiza a função para ser mais segura
ALTER FUNCTION public.cleanup_expired_data() SET search_path = public;

-- Revoga execução pública para evitar que qualquer um chame a função
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data() FROM authenticated;
