-- Keep stored defaults aligned with the official Mystic API values.
alter table public.magnific_settings
  alter column image_aspect_ratio set default 'widescreen_16_9';

update public.magnific_settings
set image_aspect_ratio = case image_aspect_ratio
  when 'landscape_16_9' then 'widescreen_16_9'
  when 'portrait_9_16' then 'social_story_9_16'
  else image_aspect_ratio
end
where image_aspect_ratio in ('landscape_16_9', 'portrait_9_16');

update public.magnific_settings
set image_model = 'realism'
where image_model not in ('realism', 'fluid', 'zen', 'flexible', 'super_real', 'editorial_portraits');
