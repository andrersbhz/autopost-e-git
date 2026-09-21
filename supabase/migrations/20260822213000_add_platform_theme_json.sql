-- Persistência centralizada do design system configurado em Marca/Vendas.
-- Mantém os campos legados para compatibilidade e adiciona apenas um documento JSON extensível.
alter table if exists public.platform_settings
  add column if not exists theme_json jsonb not null default '{}'::jsonb;

comment on column public.platform_settings.theme_json is
  'Design system global editável em Marca/Vendas: superfícies, tipografia, botões, estados, página de vendas e tokens visuais.';
