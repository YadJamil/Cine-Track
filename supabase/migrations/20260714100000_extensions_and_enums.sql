-- Extensions, helpers, enums
create extension if not exists citext;
create extension if not exists pg_trgm;

-- pg_cron is available on hosted Supabase / supabase local; skip gracefully elsewhere.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron unavailable (%) — scheduled jobs will not run in this environment', sqlerrm;
end $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create type public.media_type as enum ('show','movie');
-- observed in export: unitary / season / fill-previous; 'show' is [ASSUMPTION A2]
create type public.bulk_watch_type as enum ('unitary','season','show','fill_previous');
create type public.notification_type as enum
  ('comment_like','friend_comment','new_follower','badge_unlock','episode_airing','news','marketing','system');
-- [ASSUMPTION A6] TV Time's six episode emotions
create type public.reaction_type as enum ('good','fun','wow','sad','soso','bad');
