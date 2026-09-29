-- Split Watchlist (0 episodes watched) and Watch later (shelved in-progress shows).
create or replace view public.v_user_show_progress with (security_invoker = true) as
select us.user_id, us.show_id, s.tmdb_id, s.name, s.poster_path, s.backdrop_path, s.status,
  us.is_followed, us.is_favorited, us.is_for_later, us.is_archived,
  count(ew.id) as watched_count,
  ep.aired_count,
  max(ew.watched_at) as last_watched_at,
  case
    when us.is_archived then 'stopped'
    when count(ew.id) = 0 then 'watchlist'
    when us.is_for_later and count(ew.id) > 0 and count(ew.id) < ep.aired_count then 'watch_later'
    when count(ew.id) < ep.aired_count then 'watching'
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
