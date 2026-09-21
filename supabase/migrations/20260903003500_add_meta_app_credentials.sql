create table if not exists public.meta_app_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_id text not null,
  app_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_app_credentials enable row level security;

-- Credentials are intentionally not exposed through the Data API to authenticated users.
-- They are read/written only by Edge Functions using service_role after validating auth.
revoke all on table public.meta_app_credentials from anon, authenticated;

drop policy if exists "service role manages meta credentials" on public.meta_app_credentials;
create policy "service role manages meta credentials"
on public.meta_app_credentials
for all
to service_role
using (true)
with check (true);

create or replace function public.set_meta_app_credentials_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_meta_app_credentials_updated_at on public.meta_app_credentials;
create trigger trg_meta_app_credentials_updated_at
before update on public.meta_app_credentials
for each row execute function public.set_meta_app_credentials_updated_at();

comment on table public.meta_app_credentials is
  'Per-user Meta/Facebook OAuth app credentials. Accessible only through authenticated Edge Functions using service_role.';
