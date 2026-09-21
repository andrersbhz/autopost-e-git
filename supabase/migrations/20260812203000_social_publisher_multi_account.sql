-- PostWP Social Publisher: independent multi-account publishing layer

create table if not exists public.threads_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  threads_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, threads_user_id)
);

create table if not exists public.threads_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  return_url text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete set null,
  platform text not null check (platform in ('facebook','instagram','threads')),
  account_key text not null,
  account_name text,
  status text not null default 'pending' check (status in ('pending','publishing','success','failed')),
  remote_id text,
  permalink text,
  caption text,
  image_url text,
  link_url text,
  error_message text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_threads_accounts_user on public.threads_accounts(user_id, is_active);
create index if not exists idx_social_publications_user_created on public.social_publications(user_id, created_at desc);
create index if not exists idx_social_publications_article on public.social_publications(article_id);

alter table public.threads_accounts enable row level security;
alter table public.threads_oauth_states enable row level security;
alter table public.social_publications enable row level security;

drop policy if exists "threads accounts own rows" on public.threads_accounts;
create policy "threads accounts own rows" on public.threads_accounts
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "threads oauth state own rows" on public.threads_oauth_states;
create policy "threads oauth state own rows" on public.threads_oauth_states
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "social publications own rows" on public.social_publications;
create policy "social publications own rows" on public.social_publications
for select to authenticated using (auth.uid() = user_id);

-- Service role writes OAuth states/publication logs; authenticated users can delete their own Threads account.
grant select, insert, update, delete on public.threads_accounts to authenticated;
grant select on public.threads_oauth_states to authenticated;
grant select on public.social_publications to authenticated;
