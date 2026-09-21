create or replace function public.reactivate_meta_connection_on_token_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.access_token is distinct from old.access_token then
    new.is_active := true;
    new.facebook_enabled := true;
    if new.instagram_account_id is not null then
      new.instagram_enabled := true;
    end if;
    new.disconnected_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reactivate_meta_connection on public.facebook_accounts;
create trigger trg_reactivate_meta_connection
before insert or update on public.facebook_accounts
for each row execute function public.reactivate_meta_connection_on_token_change();

create or replace function public.reactivate_threads_connection_on_token_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.access_token is distinct from old.access_token then
    new.is_active := true;
    new.disconnected_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reactivate_threads_connection on public.threads_accounts;
create trigger trg_reactivate_threads_connection
before insert or update on public.threads_accounts
for each row execute function public.reactivate_threads_connection_on_token_change();
