-- Store the friendly values used by the current UI while the Edge Function
-- normalizes them to the official Mystic API values before each request.
alter table public.magnific_settings
  alter column image_aspect_ratio set default 'landscape_16_9';

update public.magnific_settings
set image_aspect_ratio = case image_aspect_ratio
  when 'widescreen_16_9' then 'landscape_16_9'
  when 'social_story_9_16' then 'portrait_9_16'
  else image_aspect_ratio
end
where image_aspect_ratio in ('widescreen_16_9', 'social_story_9_16');
