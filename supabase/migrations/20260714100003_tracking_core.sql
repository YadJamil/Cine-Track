-- Tracking core
create table public.user_shows (
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id bigint not null references public.shows(id) on delete cascade,
  is_followed boolean not null default true,
  is_favorited boolean not null default false,
  is_for_later boolean not null default false,          -- 'for_later' bucket
  is_archived boolean not null default false,           -- 'Stopped watching'
  followed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, show_id)
);
create index user_shows_user_followed_idx on public.user_shows (user_id) where is_followed;
create trigger user_shows_updated_at before update on public.user_shows
  for each row execute function public.set_updated_at();

-- One row per (user, episode): the atom of the product (1,194 rows in the export).
create table public.episode_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id bigint not null references public.episodes(id) on delete cascade,
  show_id bigint not null references public.shows(id) on delete cascade,  -- denormalized for per-show queries
  watched_at timestamptz not null default now(),
  bulk_type public.bulk_watch_type not null default 'unitary',
  runtime_seconds int not null default 0,               -- snapshotted at watch time (export behavior)
  unique (user_id, episode_id)
);
create index episode_watches_user_time_idx on public.episode_watches (user_id, watched_at desc);
create index episode_watches_user_show_idx on public.episode_watches (user_id, show_id);
create index episode_watches_show_idx on public.episode_watches (show_id);

create table public.movie_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id bigint not null references public.movies(id) on delete cascade,
  watched_at timestamptz not null default now(),
  runtime_seconds int not null default 0,
  unique (user_id, movie_id)
);
create index movie_watches_user_time_idx on public.movie_watches (user_id, watched_at desc);

-- Parity with user_connection.csv: one row per active day; drives streaks.
create table public.user_daily_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Parity with show_addiction_score.csv; recomputed hourly by cron.
create table public.show_addiction_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id bigint not null references public.shows(id) on delete cascade,
  daily_score int not null default 0,
  weekly_score int not null default 0,
  monthly_score int not null default 0,
  last_action_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

-- Placeholder; replaced with the real evaluator in the badges migration.
create function public.fn_check_badges(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$ begin return; end $$;

-- The flagship interaction. One round trip for unitary / season / show / fill_previous.
-- Rules: only aired episodes (air_date <= today), except an explicitly-passed episode id
-- (client confirms null/future air dates). Skips already-watched. Snapshots runtime.
-- Auto-follows the show on first watch, like the original.
create function public.mark_watched(
  p_show_id bigint,
  p_mode public.bulk_watch_type,
  p_episode_id bigint default null,
  p_season_number int default null
) returns setof public.episode_watches
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := (select auth.uid());
  v_target public.episodes%rowtype;
  v_default_runtime int;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select coalesce(episode_runtime, 30) into v_default_runtime
  from public.shows where id = p_show_id;
  if not found then
    raise exception 'SHOW_NOT_FOUND';
  end if;

  if p_mode in ('unitary','fill_previous') then
    if p_episode_id is null then raise exception 'EPISODE_REQUIRED'; end if;
    select * into v_target from public.episodes
    where id = p_episode_id and show_id = p_show_id;
    if not found then raise exception 'EPISODE_NOT_FOUND'; end if;
  elsif p_mode = 'season' then
    if p_season_number is null then raise exception 'SEASON_REQUIRED'; end if;
  end if;

  insert into public.user_shows (user_id, show_id, followed_at)
  values (v_user, p_show_id, now())
  on conflict (user_id, show_id) do nothing;

  return query
  with candidates as (
    select e.id, e.runtime
    from public.episodes e
    where e.show_id = p_show_id
      and ((e.air_date is not null and e.air_date <= current_date)
        or (e.air_date is null and e.id = p_episode_id))  -- null air date: explicit pick only (client confirms)
      and case p_mode
            when 'unitary' then e.id = p_episode_id
            when 'season'  then e.season_number = p_season_number
            when 'show'    then e.season_number > 0
            when 'fill_previous' then
              e.id = p_episode_id
              or (e.season_number > 0
                  and (e.season_number, e.episode_number)
                    < (v_target.season_number, v_target.episode_number))
          end
  )
  insert into public.episode_watches (user_id, episode_id, show_id, bulk_type, runtime_seconds)
  select v_user, c.id, p_show_id, p_mode, coalesce(c.runtime, v_default_runtime) * 60
  from candidates c
  on conflict (user_id, episode_id) do nothing
  returning *;

  perform public.fn_check_badges(v_user);
end $$;

-- Companions. Security invoker: RLS restricts deletes to the caller's own rows.
create function public.unmark_watched(p_episode_id bigint) returns void
language sql volatile set search_path = public as $$
  delete from public.episode_watches
  where episode_id = p_episode_id and user_id = (select auth.uid());
$$;

create function public.unmark_season(p_show_id bigint, p_season_number int) returns void
language sql volatile set search_path = public as $$
  delete from public.episode_watches w
  using public.episodes e
  where w.episode_id = e.id
    and w.user_id = (select auth.uid())
    and e.show_id = p_show_id
    and e.season_number = p_season_number;
$$;

-- [ASSUMPTION A4] Addiction score: daily = min(100, watches_24h * 35),
-- weekly = min(100, watches_7d * 12), monthly = min(100, watches_30d * 4)
-- (calibrated so 2–3 watches/week ≈ 35, matching the export). Recomputed hourly.
create function public.fn_recompute_addiction_scores() returns void
language sql security definer set search_path = public as $$
  insert into public.show_addiction_scores
    (user_id, show_id, daily_score, weekly_score, monthly_score, last_action_at, updated_at)
  select w.user_id, w.show_id,
    least(100, count(*) filter (where w.watched_at > now() - interval '1 day')  * 35)::int,
    least(100, count(*) filter (where w.watched_at > now() - interval '7 days') * 12)::int,
    least(100, count(*) filter (where w.watched_at > now() - interval '30 days') * 4)::int,
    max(w.watched_at), now()
  from public.episode_watches w
  where w.watched_at > now() - interval '30 days'
  group by w.user_id, w.show_id
  on conflict (user_id, show_id) do update set
    daily_score = excluded.daily_score,
    weekly_score = excluded.weekly_score,
    monthly_score = excluded.monthly_score,
    last_action_at = excluded.last_action_at,
    updated_at = now();

  update public.show_addiction_scores s
  set daily_score = 0, weekly_score = 0, monthly_score = 0, updated_at = now()
  where s.last_action_at < now() - interval '30 days'
    and (s.daily_score, s.weekly_score, s.monthly_score) <> (0, 0, 0);
$$;
