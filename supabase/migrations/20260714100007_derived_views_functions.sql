-- Derived data. Counters are ALWAYS computed from base tables
-- (the original drifted: user_statistics said 0 episodes while tracking had 1,194).

-- Per-show progress + bucket (Track screen backbone)
create view public.v_user_show_progress with (security_invoker = true) as
select us.user_id, us.show_id, s.tmdb_id, s.name, s.poster_path, s.backdrop_path, s.status,
  us.is_followed, us.is_favorited, us.is_for_later, us.is_archived,
  count(ew.id) as watched_count,
  (select count(*) from public.episodes e
    where e.show_id = us.show_id and e.season_number > 0 and e.air_date <= current_date) as aired_count,
  max(ew.watched_at) as last_watched_at,
  case
    when us.is_archived then 'stopped'
    when us.is_for_later then 'for_later'
    when count(ew.id) = 0 then 'not_started'
    when count(ew.id) >= (select count(*) from public.episodes e
      where e.show_id = us.show_id and e.season_number > 0 and e.air_date <= current_date) then 'up_to_date'
    else 'watching'
  end as bucket
from public.user_shows us
join public.shows s on s.id = us.show_id
left join public.episode_watches ew on ew.user_id = us.user_id and ew.show_id = us.show_id
group by us.user_id, us.show_id, s.id;

-- Profile counters (user_statistics parity, always consistent)
create view public.v_user_statistics with (security_invoker = true) as
select p.id as user_id,
  (select count(*) from public.user_shows us where us.user_id = p.id and us.is_followed) as shows_followed,
  (select count(*) from public.episode_watches w where w.user_id = p.id) as episodes_watched,
  (select coalesce(sum(runtime_seconds),0) from public.episode_watches w where w.user_id = p.id) as seconds_watched,
  (select count(*) from public.movie_watches w where w.user_id = p.id) as movies_watched,
  (select coalesce(sum(runtime_seconds),0) from public.movie_watches w where w.user_id = p.id) as movie_seconds_watched,
  (select count(*) from public.follows f where f.follower_id = p.id) as following_count,
  (select count(*) from public.follows f where f.followee_id = p.id) as followers_count,
  (select count(*) from public.comments c where c.user_id = p.id) as comments_count,
  (select count(*) from public.reviews r where r.user_id = p.id) as reviews_count,
  (select count(*) from public.user_badges b where b.user_id = p.id) as badges_count
from public.profiles p;

-- Stats page: last 12 calendar months, zero-filled (stats-prod-cache 'count-by-month' shape)
create function public.fn_stats_by_month(p_user_id uuid, p_media public.media_type)
returns table (month text, count int, hours numeric)
language sql stable set search_path = public as $$
  with src as (
    select watched_at, runtime_seconds from public.episode_watches
    where user_id = p_user_id and p_media = 'show'
    union all
    select watched_at, runtime_seconds from public.movie_watches
    where user_id = p_user_id and p_media = 'movie'
  ),
  months as (
    select date_trunc('month', now()) - make_interval(months => g) as m
    from generate_series(11, 0, -1) as g
  ),
  agg as (
    select date_trunc('month', watched_at) as m, count(*) as c, sum(runtime_seconds) as secs
    from src group by 1
  )
  select to_char(months.m, 'YYYY-MM'),
         coalesce(agg.c, 0)::int,
         round(coalesce(agg.secs, 0) / 3600.0, 1)
  from months left join agg on agg.m = months.m
  order by months.m;
$$;

-- Last 12 ISO weeks, zero-filled ('count-by-week' shape)
create function public.fn_stats_by_week(p_user_id uuid, p_media public.media_type)
returns table (week text, count int, hours numeric)
language sql stable set search_path = public as $$
  with src as (
    select watched_at, runtime_seconds from public.episode_watches
    where user_id = p_user_id and p_media = 'show'
    union all
    select watched_at, runtime_seconds from public.movie_watches
    where user_id = p_user_id and p_media = 'movie'
  ),
  weeks as (
    select date_trunc('week', now()) - make_interval(weeks => g) as w
    from generate_series(11, 0, -1) as g
  ),
  agg as (
    select date_trunc('week', watched_at) as w, count(*) as c, sum(runtime_seconds) as secs
    from src group by 1
  )
  select to_char(weeks.w, 'IYYY-"W"IW'),
         coalesce(agg.c, 0)::int,
         round(coalesce(agg.secs, 0) / 3600.0, 1)
  from weeks left join agg on agg.w = weeks.w
  order by weeks.w;
$$;

-- [ASSUMPTION A5] marathon = max episodes of one show watched in one calendar day
create function public.fn_biggest_marathons(p_user_id uuid)
returns table (show_id bigint, show_tmdb_id int, show_name text, poster_path text, episodes int, day date)
language sql stable set search_path = public as $$
  with daily as (
    select w.show_id, w.watched_at::date as d, count(*) as c
    from public.episode_watches w
    where w.user_id = p_user_id
    group by 1, 2
  ),
  best as (
    select distinct on (daily.show_id) daily.show_id, daily.d, daily.c
    from daily order by daily.show_id, daily.c desc, daily.d desc
  )
  select b.show_id, s.tmdb_id, s.name, s.poster_path, b.c::int, b.d
  from best b join public.shows s on s.id = b.show_id
  order by b.c desc, b.d desc
  limit 5;
$$;

-- Earliest aired-unwatched episode (Watch Next card / resume pointer)
create function public.fn_next_episode(p_user_id uuid, p_show_id bigint)
returns setof public.episodes
language sql stable set search_path = public as $$
  select e.* from public.episodes e
  where e.show_id = p_show_id and e.season_number > 0
    and e.air_date is not null and e.air_date <= current_date
    and not exists (select 1 from public.episode_watches w
                    where w.user_id = p_user_id and w.episode_id = e.id)
  order by e.season_number, e.episode_number
  limit 1;
$$;

-- Watch Next: one row per followed, non-archived, non-for-later show with an aired unwatched ep
create function public.fn_watch_next(p_user_id uuid)
returns table (
  show_id bigint, show_tmdb_id int, show_name text, poster_path text, backdrop_path text,
  episode_id bigint, season_number int, episode_number int, episode_name text,
  episode_air_date date, episode_runtime int,
  watched_count bigint, aired_count bigint, last_watched_at timestamptz
)
language sql stable set search_path = public as $$
  select s.id, s.tmdb_id, s.name, s.poster_path, s.backdrop_path,
         ne.id, ne.season_number, ne.episode_number, ne.name, ne.air_date, ne.runtime,
         st.watched, st.aired, st.last_watched
  from public.user_shows us
  join public.shows s on s.id = us.show_id
  join lateral (
    select e.* from public.episodes e
    where e.show_id = us.show_id and e.season_number > 0
      and e.air_date is not null and e.air_date <= current_date
      and not exists (select 1 from public.episode_watches w
                      where w.user_id = us.user_id and w.episode_id = e.id)
    order by e.season_number, e.episode_number
    limit 1
  ) ne on true
  cross join lateral (
    select
      (select count(*) from public.episode_watches w
        where w.user_id = us.user_id and w.show_id = us.show_id) as watched,
      (select count(*) from public.episodes e
        where e.show_id = us.show_id and e.season_number > 0 and e.air_date <= current_date) as aired,
      (select max(w.watched_at) from public.episode_watches w
        where w.user_id = us.user_id and w.show_id = us.show_id) as last_watched
  ) st
  where us.user_id = p_user_id and us.is_followed and not us.is_archived and not us.is_for_later
  order by st.last_watched desc nulls last, s.name;
$$;

-- Calendar: episodes of followed shows in range, honoring exclusions
create function public.fn_upcoming_calendar(p_user_id uuid, p_from date, p_to date)
returns table (
  episode_id bigint, show_id bigint, show_tmdb_id int, show_name text, poster_path text, still_path text,
  season_number int, episode_number int, episode_name text,
  air_date date, runtime int, is_watched boolean
)
language sql stable set search_path = public as $$
  select e.id, s.id, s.tmdb_id, s.name, s.poster_path, e.still_path,
         e.season_number, e.episode_number, e.name, e.air_date, e.runtime,
         exists (select 1 from public.episode_watches w
                 where w.user_id = p_user_id and w.episode_id = e.id)
  from public.user_shows us
  join public.shows s on s.id = us.show_id
  join public.episodes e on e.show_id = s.id
  where us.user_id = p_user_id and us.is_followed and not us.is_archived
    and e.air_date between p_from and p_to
    and not us.show_id = any (coalesce(
      (select st.excluded_show_ids from public.user_settings st where st.user_id = p_user_id),
      '{}'::bigint[]))
  order by e.air_date, s.name, e.season_number, e.episode_number;
$$;

-- Affinity between two users (also used by the follows trigger)
-- defined in the social migration: public.fn_affinity(uuid, uuid)

-- Activity feed: events from followed public users + self.
-- [ASSUMPTION A8] watches grouped into sessions: same user+show, gap <= 60 min.
create function public.fn_activity_feed(p_user_id uuid, p_limit int default 30, p_before timestamptz default null)
returns table (
  event_type text, actor_id uuid, actor_username text, actor_display_name text,
  actor_avatar_url text, created_at timestamptz, payload jsonb
)
language sql stable set search_path = public as $$
  with people as (
    select f.followee_id as id from public.follows f
    join public.profiles p on p.id = f.followee_id and p.is_public
    where f.follower_id = p_user_id
    union
    select p_user_id
  ),
  marked as (
    select w.user_id, w.show_id, w.watched_at, w.episode_id,
      case when w.watched_at - lag(w.watched_at) over
             (partition by w.user_id, w.show_id order by w.watched_at)
           > interval '60 minutes'
           or lag(w.watched_at) over
             (partition by w.user_id, w.show_id order by w.watched_at) is null
      then 1 else 0 end as new_session
    from public.episode_watches w
    where w.user_id in (select id from people)
  ),
  sessions as (
    select user_id, show_id, watched_at, episode_id,
      sum(new_session) over (partition by user_id, show_id order by watched_at) as grp
    from marked
  ),
  watch_events as (
    select se.user_id, max(se.watched_at) as t,
      jsonb_build_object(
        'show_id', se.show_id, 'show_tmdb_id', sh.tmdb_id,
        'show_name', sh.name, 'poster_path', sh.poster_path,
        'episode_count', count(*),
        'last_episode_id', (array_agg(se.episode_id order by se.watched_at desc))[1]
      ) as payload
    from sessions se join public.shows sh on sh.id = se.show_id
    group by se.user_id, se.show_id, se.grp, sh.id
  ),
  events as (
    select 'watch'::text as event_type, w.user_id as actor_id, w.t as created_at, w.payload
    from watch_events w
    union all
    select 'follow', f.follower_id, f.created_at,
      jsonb_build_object('followee_id', f.followee_id, 'followee_username', fp.username::text,
                         'followee_display_name', fp.display_name, 'followee_avatar_url', fp.avatar_url)
    from public.follows f
    join public.profiles fp on fp.id = f.followee_id
    where f.follower_id in (select id from people)
    union all
    select 'review', r.user_id, r.created_at,
      jsonb_build_object('media_type', r.media_type, 'rating', r.rating, 'body', left(r.body, 280),
        'show_id', r.show_id, 'movie_id', r.movie_id,
        'tmdb_id', coalesce(s.tmdb_id, m.tmdb_id),
        'title', coalesce(s.name, m.title),
        'poster_path', coalesce(s.poster_path, m.poster_path))
    from public.reviews r
    left join public.shows s on s.id = r.show_id
    left join public.movies m on m.id = r.movie_id
    where r.user_id in (select id from people)
    union all
    select 'badge', ub.user_id, ub.unlocked_at,
      jsonb_build_object('badge_id', b.id, 'badge_name', b.name, 'icon', b.icon)
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id in (select id from people)
  )
  select e.event_type, e.actor_id, p.username::text, p.display_name, p.avatar_url,
         e.created_at, e.payload
  from events e
  join public.profiles p on p.id = e.actor_id
  where e.created_at < coalesce(p_before, now() + interval '1 second')
  order by e.created_at desc
  limit least(p_limit, 100);
$$;

-- User search RPC: resolves usernames even for private profiles
create function public.fn_search_users(p_query text, p_limit int default 20)
returns table (id uuid, username text, display_name text, avatar_url text, is_public boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, p.is_public
  from public.profiles p
  where p.username % p_query
     or p.display_name % p_query
     or p.username::text ilike p_query || '%'
     or p.display_name ilike '%' || p_query || '%'
  order by greatest(similarity(p.username::text, p_query),
                    similarity(coalesce(p.display_name, ''), p_query)) desc
  limit least(p_limit, 50);
$$;

-- Explore: cross-user aggregate, safe to serve anonymously, refreshed concurrently by cron
create materialized view public.mv_trending_shows as
select s.id as show_id, s.tmdb_id, s.name, s.poster_path, s.backdrop_path,
       s.first_air_date, s.vote_average,
  count(distinct us.user_id) filter (where us.followed_at > now() - interval '7 days') as recent_follows,
  count(distinct w.user_id)  filter (where w.watched_at  > now() - interval '7 days') as recent_watchers,
  count(w.id)                filter (where w.watched_at  > now() - interval '7 days') as recent_watches,
  ( count(distinct us.user_id) filter (where us.followed_at > now() - interval '7 days') * 3
  + count(distinct w.user_id)  filter (where w.watched_at  > now() - interval '7 days') * 2
  + count(w.id)                filter (where w.watched_at  > now() - interval '7 days')
  ) as trend_score
from public.shows s
left join public.user_shows us on us.show_id = s.id and us.is_followed
left join public.episode_watches w on w.show_id = s.id
group by s.id
having count(us.user_id) > 0 or count(w.id) > 0;
create unique index mv_trending_shows_pk on public.mv_trending_shows (show_id);
create index mv_trending_shows_score_idx on public.mv_trending_shows (trend_score desc);

create function public.fn_refresh_trending() returns void
language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.mv_trending_shows;
end $$;
