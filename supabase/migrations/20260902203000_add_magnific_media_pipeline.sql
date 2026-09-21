-- Magnific AI media automation
-- API secrets intentionally stay in Supabase Edge Function secrets (MAGNIFIC_API_KEY).

create table if not exists public.magnific_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  auto_generate_images boolean not null default true,
  auto_generate_videos boolean not null default false,
  image_aspect_ratio text not null default 'landscape_16_9',
  image_resolution text not null default '2k',
  image_model text not null default 'realism',
  video_aspect_ratio text not null default '9:16',
  video_resolution text not null default '720p',
  video_duration integer not null default 8 check (video_duration in (4, 6, 8)),
  video_generate_audio boolean not null default true,
  prompt_template text,
  negative_prompt text not null default 'blurry, low quality, distorted, watermark, logo, unreadable text, duplicate subjects',
  editorial_safety boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.magnific_settings enable row level security;

drop policy if exists "Users can read own Magnific settings" on public.magnific_settings;
create policy "Users can read own Magnific settings"
on public.magnific_settings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own Magnific settings" on public.magnific_settings;
create policy "Users can insert own Magnific settings"
on public.magnific_settings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own Magnific settings" on public.magnific_settings;
create policy "Users can update own Magnific settings"
on public.magnific_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.media_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  provider text not null default 'magnific',
  media_type text not null check (media_type in ('image', 'video')),
  task_id text not null,
  status text not null default 'CREATED',
  prompt text not null,
  input_url text,
  output_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_media_generation_jobs_user_status
  on public.media_generation_jobs(user_id, status);
create index if not exists idx_media_generation_jobs_article
  on public.media_generation_jobs(article_id, media_type, created_at desc);
create unique index if not exists idx_media_generation_jobs_provider_task
  on public.media_generation_jobs(provider, task_id);

alter table public.media_generation_jobs enable row level security;

drop policy if exists "Users can read own media jobs" on public.media_generation_jobs;
create policy "Users can read own media jobs"
on public.media_generation_jobs for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own media jobs" on public.media_generation_jobs;
create policy "Users can insert own media jobs"
on public.media_generation_jobs for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own media jobs" on public.media_generation_jobs;
create policy "Users can update own media jobs"
on public.media_generation_jobs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.articles
  add column if not exists generated_video_url text;

comment on table public.magnific_settings is 'Per-user non-secret configuration for Magnific image/video generation.';
comment on table public.media_generation_jobs is 'Asynchronous Magnific task tracking for article media.';
comment on column public.articles.generated_video_url is 'Generated vertical/landscape video URL for social distribution.';
