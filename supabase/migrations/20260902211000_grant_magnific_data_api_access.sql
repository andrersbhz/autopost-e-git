-- Explicit Data API grants for the authenticated frontend.
-- Row-level security remains authoritative for which rows each user can access.

grant select, insert, update on table public.magnific_settings to authenticated;
grant select on table public.media_generation_jobs to authenticated;
