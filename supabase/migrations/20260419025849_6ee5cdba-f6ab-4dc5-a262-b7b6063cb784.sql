-- Tabela para armazenar estados temporários do OAuth Facebook (anti-CSRF + identificação do usuário no callback)
CREATE TABLE IF NOT EXISTS public.facebook_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

ALTER TABLE public.facebook_oauth_states ENABLE ROW LEVEL SECURITY;

-- Apenas a service role acessa esta tabela (gerenciada pelas edge functions)
CREATE POLICY "Service role only" ON public.facebook_oauth_states
  FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_facebook_oauth_states_expires ON public.facebook_oauth_states(expires_at);