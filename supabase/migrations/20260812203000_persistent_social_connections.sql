alter table public.facebook_accounts
  add column if not exists facebook_enabled boolean not null default true,
  add column if not exists instagram_enabled boolean not null default true,
  add column if not exists disconnected_at timestamptz;

alter table public.threads_accounts
  add column if not exists disconnected_at timestamptz;

update public.facebook_accounts
set facebook_enabled = true,
    instagram_enabled = case when instagram_account_id is not null then true else instagram_enabled end
where is_active = true;

create index if not exists idx_facebook_accounts_user_enabled
  on public.facebook_accounts(user_id, is_active, facebook_enabled, instagram_enabled);

create index if not exists idx_threads_accounts_user_active
  on public.threads_accounts(user_id, is_active);
