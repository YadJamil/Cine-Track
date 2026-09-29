-- Expose show genres on v_user_show_progress so the profile can filter by genre.
-- create-or-replace requires new columns to be appended at the end.
create or replace view public.v_user_show_progress with (security_invoker = true) as
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
  end as bucket,
  s.genres
from public.user_shows us
join public.shows s on s.id = us.show_id
left join public.episode_watches ew on ew.user_id = us.user_id and ew.show_id = us.show_id
group by us.user_id, us.show_id, s.id;
