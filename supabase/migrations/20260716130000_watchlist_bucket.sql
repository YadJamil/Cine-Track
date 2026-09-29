-- "For later" becomes the **Watchlist**, and "not started" folds into it: a show
-- in your library with nothing watched *is* a watchlist entry, so a separate
-- bucket only split the same idea in two.
--
-- watchlist = explicitly shelved (is_for_later) OR nothing watched yet.
-- Buckets stay derived — see the completed_bucket migration.
create or replace view public.v_user_show_progress with (security_invoker = true) as
select us.user_id, us.show_id, s.tmdb_id, s.name, s.poster_path, s.backdrop_path, s.status,
  us.is_followed, us.is_favorited, us.is_for_later, us.is_archived,
  count(ew.id) as watched_count,
  ep.aired_count,
  max(ew.watched_at) as last_watched_at,
  case
    when us.is_archived then 'stopped'
    when us.is_for_later or count(ew.id) = 0 then 'watchlist'
    when count(ew.id) < ep.aired_count then 'watching'
    -- Everything aired has been seen: finished for good, or merely caught up?
    when ep.aired_count > 0 and s.status = 'Ended' and ep.upcoming_count = 0 then 'completed'
    else 'up_to_date'
  end as bucket,
  s.genres
from public.user_shows us
join public.shows s on s.id = us.show_id
left join lateral (
  select
    count(*) filter (where e.air_date <= current_date) as aired_count,
    count(*) filter (where e.air_date > current_date) as upcoming_count
  from public.episodes e
  where e.show_id = us.show_id and e.season_number > 0
) ep on true
left join public.episode_watches ew on ew.user_id = us.user_id and ew.show_id = us.show_id
group by us.user_id, us.show_id, s.id, ep.aired_count, ep.upcoming_count;

-- Starting a show takes it off the watchlist. Without this, an explicitly
-- shelved show would stay in the watchlist forever once you began watching it.
-- (Only change from the original: `do nothing` -> `do update set is_for_later`.)
create or replace function public.mark_watched(
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
  on conflict (user_id, show_id) do update set is_for_later = false;

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
