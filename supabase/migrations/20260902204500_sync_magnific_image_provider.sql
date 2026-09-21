-- When Magnific automatic images are enabled, stop the legacy OpenAI image step.
-- This avoids paying two providers for the same article and leaves the article
-- without a featured image until the Magnific async job completes.

create or replace function public.sync_magnific_image_provider()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.enabled = true and new.auto_generate_images = true then
    update public.user_settings
      set image_mode = 'none'
    where user_id = new.user_id
      and coalesce(image_mode, 'ai') <> 'none';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_magnific_image_provider on public.magnific_settings;
create trigger trg_sync_magnific_image_provider
after insert or update of enabled, auto_generate_images
on public.magnific_settings
for each row
execute function public.sync_magnific_image_provider();

comment on function public.sync_magnific_image_provider() is
  'Prevents duplicate OpenAI + Magnific image generation when Magnific automation is active without elevating caller privileges.';
