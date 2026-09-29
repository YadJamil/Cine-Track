-- Movie watches were missing from the activity feed (fn_activity_feed only read
-- episode_watches). Add a 'movie_watch' event sourced from movie_watches.

create or replace function public.fn_activity_feed(p_user_id uuid, p_limit int default 30, p_before timestamptz default null)
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
    select 'movie_watch', mw.user_id, mw.watched_at,
      jsonb_build_object('movie_id', mw.movie_id, 'source_id', m.source_id,
        'title', m.title, 'poster_path', m.poster_path)
    from public.movie_watches mw
    join public.movies m on m.id = mw.movie_id
    where mw.user_id in (select id from people)
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
        'tmdb_id', coalesce(s.tmdb_id::text, m.source_id),
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
