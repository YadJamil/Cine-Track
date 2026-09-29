-- Split the "seen everything that aired" state into two buckets:
--   completed   — the show has Ended and has nothing upcoming; it is finished for good.
--   up_to_date  — caught up, but more is coming (Running / To Be Determined / a
--                 season already on the schedule).
--
-- The bucket stays DERIVED (never stored), so it self-corrects without any sync job:
--   * a scheduled episode's air_date arriving  -> aired_count grows -> 'watching'
--   * a revival flipping status off 'Ended'    -> 'completed' -> 'up_to_date'
--   * a new season announced (future episodes) -> 'completed' -> 'up_to_date'
-- Freshness of status/episodes comes from the read-through cache (lib/tmdb/cache.ts).
--
-- Also replaces two correlated subqueries over episodes with one LATERAL pass that
-- computes the aired and upcoming counts together.
create or replace view public.v_user_show_progress with (security_invoker = true) as
select us.user_id, us.show_id, s.tmdb_id, s.name, s.poster_path, s.backdrop_path, s.status,
  us.is_followed, us.is_favorited, us.is_for_later, us.is_archived,
  count(ew.id) as watched_count,
  ep.aired_count,
  max(ew.watched_at) as last_watched_at,
  case
    when us.is_archived then 'stopped'
    when us.is_for_later then 'for_later'
    when count(ew.id) = 0 then 'not_started'
    when count(ew.id) < ep.aired_count then 'watching'
    -- Everything aired has been seen: finished for good, or merely caught up?
    when ep.aired_count > 0 and s.status = 'Ended' and ep.upcoming_count = 0 then 'completed'
    else 'up_to_date'
  end as bucket,
  s.genres
from public.user_shows us
join public.shows s on s.id = us.show_id
-- One pass over the show's episodes for both counts. Specials (season 0) are excluded,
-- and episodes with no air_date yet count as neither aired nor upcoming.
left join lateral (
  select
    count(*) filter (where e.air_date <= current_date) as aired_count,
    count(*) filter (where e.air_date > current_date) as upcoming_count
  from public.episodes e
  where e.show_id = us.show_id and e.season_number > 0
) ep on true
left join public.episode_watches ew on ew.user_id = us.user_id and ew.show_id = us.show_id
group by us.user_id, us.show_id, s.id, ep.aired_count, ep.upcoming_count;
