-- Stabilize credential status and secure Google Search Console OAuth storage.
-- Safe/idempotent: keeps login auth independent from Google OAuth.

alter table public.user_settings
  add column if not exists google_oauth_client_id text,
  add column if not exists google_oauth_secret_vault_id uuid;

create or replace function public.get_credentials_status()
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare result json;
begin
  select json_build_object(
    'has_wp_password', (wordpress_app_password is not null and wordpress_app_password <> ''),
    'has_fb_token', (facebook_access_token is not null and facebook_access_token <> ''),
    'has_gemini_key', (gemini_api_key is not null and gemini_api_key <> ''),
    'has_openai_key', (openai_api_key is not null and openai_api_key <> ''),
    'has_azure_key', (azure_openai_api_key is not null and azure_openai_api_key <> ''),
    'has_groq_key', (groq_api_key is not null and groq_api_key <> ''),
    'has_linkedin_token', (linkedin_access_token is not null and linkedin_access_token <> ''),
    'has_google_indexing_key', (google_indexing_key is not null and google_indexing_key <> ''),
    'has_youtube_key', (youtube_api_key is not null and youtube_api_key <> '')
  ) into result
  from public.user_settings
  where user_id = auth.uid();

  return coalesce(result, json_build_object(
    'has_wp_password', false,
    'has_fb_token', false,
    'has_gemini_key', false,
    'has_openai_key', false,
    'has_azure_key', false,
    'has_groq_key', false,
    'has_linkedin_token', false,
    'has_google_indexing_key', false,
    'has_youtube_key', false
  ));
end;
$$;

create or replace function public.get_google_oauth_credentials_status()
returns json
language sql
security definer
set search_path to 'public'
as $$
  select coalesce(
    (
      select json_build_object(
        'client_id', coalesce(google_oauth_client_id, ''),
        'has_secret', google_oauth_secret_vault_id is not null
      )
      from public.user_settings
      where user_id = auth.uid()
    ),
    json_build_object('client_id', '', 'has_secret', false)
  );
$$;

create or replace function public.save_google_oauth_credentials(
  p_client_id text,
  p_client_secret text default null
)
returns json
language plpgsql
security definer
set search_path to 'public', 'vault'
as $$
declare
  uid uuid := auth.uid();
  existing_id uuid;
  secret_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_client_id), '') = '' then raise exception 'Client ID is required'; end if;

  select google_oauth_secret_vault_id
    into existing_id
  from public.user_settings
  where user_id = uid;

  secret_id := existing_id;

  if p_client_secret is not null and trim(p_client_secret) <> '' then
    if existing_id is null then
      secret_id := vault.create_secret(
        p_client_secret,
        'google_oauth_secret_' || uid::text,
        'Google OAuth Client Secret for PostWP'
      );
    else
      perform vault.update_secret(
        existing_id,
        p_client_secret,
        'google_oauth_secret_' || uid::text,
        'Google OAuth Client Secret for PostWP'
      );
    end if;
  end if;

  insert into public.user_settings(user_id, google_oauth_client_id, google_oauth_secret_vault_id)
  values(uid, trim(p_client_id), secret_id)
  on conflict(user_id) do update set
    google_oauth_client_id = excluded.google_oauth_client_id,
    google_oauth_secret_vault_id = coalesce(
      excluded.google_oauth_secret_vault_id,
      public.user_settings.google_oauth_secret_vault_id
    );

  return json_build_object('success', true, 'has_secret', secret_id is not null);
end;
$$;

create or replace function public.disconnect_google_oauth_credentials()
returns void
language plpgsql
security definer
set search_path to 'public', 'vault'
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select google_oauth_secret_vault_id
    into sid
  from public.user_settings
  where user_id = uid;

  if sid is not null then
    delete from vault.secrets where id = sid;
  end if;

  update public.user_settings
  set google_oauth_client_id = null,
      google_oauth_secret_vault_id = null
  where user_id = uid;
end;
$$;

create or replace function public.get_google_oauth_credentials_for_backend(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'vault'
as $$
declare
  cid text;
  sid uuid;
  secret_value text;
begin
  select google_oauth_client_id, google_oauth_secret_vault_id
    into cid, sid
  from public.user_settings
  where user_id = p_user_id;

  if sid is not null then
    select decrypted_secret
      into secret_value
    from vault.decrypted_secrets
    where id = sid;
  end if;

  return json_build_object(
    'client_id', coalesce(cid, ''),
    'client_secret', coalesce(secret_value, '')
  );
end;
$$;

revoke all on function public.get_google_oauth_credentials_for_backend(uuid) from public;
revoke all on function public.get_google_oauth_credentials_for_backend(uuid) from anon;
revoke all on function public.get_google_oauth_credentials_for_backend(uuid) from authenticated;
grant execute on function public.get_google_oauth_credentials_for_backend(uuid) to service_role;
