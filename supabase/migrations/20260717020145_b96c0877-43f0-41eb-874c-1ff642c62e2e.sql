ALTER TABLE public.platform_settings 
  ADD COLUMN IF NOT EXISTS plans_json jsonb NOT NULL DEFAULT '[
    {"name":"Starter","plan":"starter_monthly","amountBRL":197,"price":"R$ 197","period":"/mês","highlight":false,"tag":"Para começar","cta":"Assinar Starter","features":["1 portal WordPress","Crie quantos artigos quiser","1 conta Facebook + Instagram","Analytics básico","Suporte por e-mail"]},
    {"name":"Pro","plan":"pro_monthly","amountBRL":497,"price":"R$ 497","period":"/mês","highlight":true,"tag":"Mais escolhido","cta":"Assinar Pro agora","features":["3 portais WordPress","Artigos ilimitados com IA","Multi-contas Meta + Instagram","Google Indexing + Search Console","Robô Social humanizado 24/7","Analytics avançado + insights IA","Suporte prioritário"]},
    {"name":"Enterprise","plan":null,"amountBRL":0,"price":"Sob consulta","period":"","highlight":false,"tag":"White-label","cta":"Falar com vendas","features":["Portais ilimitados","NEXA Insight multi-empresa","SSO, auditoria e compliance","API dedicada + integrações custom","Gerente de sucesso dedicado","SLA 99.9%"]}
  ]'::jsonb;

UPDATE public.platform_settings 
  SET description = REPLACE(description, '3 artigos por dia', 'quantos artigos quiser')
  WHERE description LIKE '%3 artigos por dia%';
