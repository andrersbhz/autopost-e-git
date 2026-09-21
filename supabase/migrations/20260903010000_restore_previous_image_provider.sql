-- Preserve and restore the user's legacy image provider around Magnific automation.
alter table public.magnific_settings
  add column if not exists previous_image_mode text
  check (previous_image_mode is null or previous_image_mode in ('ai', 'manual', 'none'));

create or replace function public.sync_magnific_image_provider()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_mode text;
begin
  select image_mode into current_mode
  from public.user_settings
  where user_id = new.user_id;

  if new.enabled = true and new.auto_generate_images = true then
    if coalesce(current_mode, 'ai') <> 'none' and new.previous_image_mode is null then
      update public.magnific_settings
      set previous_image_mode = coalesce(current_mode, 'ai')
      where user_id = new.user_id;
    end if;

    update public.user_settings
    set image_mode = 'none'
    where user_id = new.user_id
      and coalesce(image_mode, 'ai') <> 'none';
  elsif tg_op = 'UPDATE'
    and old.enabled = true
    and old.auto_generate_images = true
    and (new.enabled = false or new.auto_generate_images = false) then
    update public.user_settings
    set image_mode = coalesce(new.previous_image_mode, old.previous_image_mode, 'ai')
    where user_id = new.user_id
      and coalesce(image_mode, 'none') = 'none';
  end if;

  return new;
end;
$$;

comment on column public.magnific_settings.previous_image_mode is
  'Image provider selected before Magnific automation was enabled.';
