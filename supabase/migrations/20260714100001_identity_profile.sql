-- Identity & profile
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,                                   -- screen_name in user_social_data.csv
  avatar_url text,
  cover_url text,                                      -- profile cover (show artwork or upload)
  cover_show_id bigint,                                -- FK added after shows exists
  bio text check (char_length(bio) <= 500),
  gender text,
  birthday date,
  is_public boolean not null default true,             -- public_profile in user.csv
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create index profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);
create index profiles_display_name_trgm_idx on public.profiles using gin (display_name gin_trgm_ops);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  notify_comment_likes boolean not null default true,
  notify_friend_comments boolean not null default true,
  notify_new_followers boolean not null default true,   -- friend_invites in user_setting.csv
  notify_badge_unlocks boolean not null default true,
  notify_news boolean not null default true,
  notify_episode_airing boolean not null default true,
  airing_offset_minutes int not null default 1440,      -- default_notification_offset
  calendar_backward_days int not null default 1,        -- backward_days
  excluded_show_ids bigint[] not null default '{}',     -- excluded_shows
  marketing_opt_in boolean not null default false,
  is_valid_age boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Signup auto-provisioning (mirrors the original's monolith bootstrap)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text,1,8)),
          new.raw_user_meta_data->>'display_name');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
