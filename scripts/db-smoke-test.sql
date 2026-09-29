-- Behavioral smoke test for the tracking core.
-- Run on a fresh DB after shim + migrations:
--   psql -d episode_test -v ON_ERROR_STOP=1 -f scripts/db-smoke-test.sql
-- Every check raises on failure; prints SMOKE TEST PASSED at the end.
begin;

-- helper
create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ASSERT FAILED: %', msg; end if;
end $$;

-- 1) two users; signup trigger provisions profile + settings
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'naza@example.com',  '{"username":"naza","display_name":"Naza"}'),
  ('00000000-0000-0000-0000-000000000002', 'lena@example.com',  '{"username":"lena","display_name":"Lena"}');
select pg_temp.assert(count(*) = 2, 'profiles auto-provisioned') from public.profiles;
select pg_temp.assert(count(*) = 2, 'settings auto-provisioned') from public.user_settings;

-- 2) a show: S1 3 aired eps, S2 2 aired + 1 future + 1 unknown air date
insert into public.shows (tmdb_id, name, episode_runtime, status) overriding user value
  values (94605, 'Arcane', 40, 'Ended');
insert into public.seasons (show_id, season_number, name)
  select id, n, 'Season ' || n from public.shows, generate_series(1, 2) n;
insert into public.episodes (show_id, season_id, season_number, episode_number, name, air_date, runtime)
select s.id, se.id, se.season_number, e.n, format('S%sE%s', se.season_number, e.n),
  case
    when se.season_number = 1 then date '2021-11-06' + e.n
    when e.n <= 2 then date '2024-11-09' + e.n
    when e.n = 3 then current_date + 30           -- future
    else null                                      -- unknown air date
  end,
  case when se.season_number = 1 and e.n = 1 then 47 else null end
from public.shows s
join public.seasons se on se.show_id = s.id
cross join generate_series(1, case when se.season_number = 1 then 3 else 4 end) as e(n);

-- act as naza
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- 3) fill_previous on S2E1 marks S1E1..3 + S2E1 = 4 rows, snapshots runtime
select pg_temp.assert(count(*) = 4, 'fill_previous marks target + all earlier aired')
from public.mark_watched((select id from public.shows limit 1), 'fill_previous',
  (select id from public.episodes where season_number = 2 and episode_number = 1));
select pg_temp.assert(
  (select runtime_seconds from public.episode_watches w
   join public.episodes e on e.id = w.episode_id
   where e.season_number = 1 and e.episode_number = 1) = 47 * 60,
  'episode runtime snapshotted (47m)');
select pg_temp.assert(
  (select runtime_seconds from public.episode_watches w
   join public.episodes e on e.id = w.episode_id
   where e.season_number = 1 and e.episode_number = 2) = 40 * 60,
  'falls back to show.episode_runtime (40m)');
select pg_temp.assert(
  (select count(*) from public.user_shows where user_id = auth.uid() and is_followed) = 1,
  'auto-followed on first watch');

-- 4) idempotent re-mark
select pg_temp.assert(count(*) = 0, 're-mark inserts nothing')
from public.mark_watched((select id from public.shows limit 1), 'fill_previous',
  (select id from public.episodes where season_number = 2 and episode_number = 1));

-- 5) unaired episode rejected even when explicitly targeted
do $$
declare n int;
begin
  select count(*) into n from public.mark_watched(
    (select id from public.shows limit 1), 'unitary',
    (select id from public.episodes where season_number = 2 and episode_number = 3));
  if n <> 0 then raise exception 'ASSERT FAILED: future episode must not be markable'; end if;
end $$;

-- 6) season mode adds only remaining AIRED episode of S2 (E2); future + null skipped
select pg_temp.assert(count(*) = 1, 'season mode adds only aired unwatched')
from public.mark_watched((select id from public.shows limit 1), 'season', null, 2);

-- 6b) null-air-date episode markable only via explicit unitary pick
select pg_temp.assert(count(*) = 1, 'null air date markable when explicitly picked')
from public.mark_watched((select id from public.shows limit 1), 'unitary',
  (select id from public.episodes where season_number = 2 and episode_number = 4));
select public.unmark_watched((select id from public.episodes where season_number = 2 and episode_number = 4));

-- 7) bucket = up_to_date (5 aired, 5 watched). The show is 'Ended', but S2E3 is
-- still scheduled — caught up, not finished.
select pg_temp.assert(bucket = 'up_to_date', 'bucket up_to_date while an episode is still scheduled, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();

-- 7b) nothing left to air + status Ended → completed
update public.episodes set air_date = null where season_number = 2 and episode_number = 3;
select pg_temp.assert(bucket = 'completed', 'bucket completed when Ended with nothing upcoming, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();

-- 7c) a revival (status leaves 'Ended') reopens it as up_to_date
update public.shows set status = 'Running';
select pg_temp.assert(bucket = 'up_to_date', 'bucket up_to_date when the show returns, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();

-- 7d) a newly announced season (future episode) also reopens it, even while the
-- provider still reports 'Ended' — guards against stale metadata.
update public.shows set status = 'Ended';
update public.episodes set air_date = current_date + 30 where season_number = 2 and episode_number = 3;
select pg_temp.assert(bucket = 'up_to_date', 'bucket up_to_date when a season is announced, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();

-- 8) unmark → watching; fn_watch_next resumes at the unmarked episode
select public.unmark_watched((select id from public.episodes where season_number = 2 and episode_number = 2));
select pg_temp.assert(bucket = 'watching', 'bucket watching after unmark')
from public.v_user_show_progress where user_id = auth.uid();
select pg_temp.assert(season_number = 2 and episode_number = 2, 'watch next resumes at S2E2')
from public.fn_watch_next(auth.uid());

-- 9) archive → stopped bucket and excluded from watch next
update public.user_shows set is_archived = true where user_id = auth.uid();
select pg_temp.assert(bucket = 'stopped', 'bucket stopped when archived')
from public.v_user_show_progress where user_id = auth.uid();
select pg_temp.assert(count(*) = 0, 'archived shows leave watch next') from public.fn_watch_next(auth.uid());
update public.user_shows set is_archived = false where user_id = auth.uid();

-- 9b) watchlist: an explicitly shelved show sits in the watchlist even mid-watch…
update public.user_shows set is_for_later = true where user_id = auth.uid();
select pg_temp.assert(bucket = 'watchlist', 'bucket watchlist when shelved, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();
-- …and watching takes it back off. Re-marking an already-watched episode leaves
-- the count alone but still runs the follow/shelve upsert.
select public.mark_watched((select id from public.shows limit 1), 'unitary',
  (select id from public.episodes where season_number = 1 and episode_number = 1));
select pg_temp.assert((select not is_for_later from public.user_shows where user_id = auth.uid()),
  'starting a show clears the watchlist flag');
select pg_temp.assert(bucket = 'watching', 'bucket back to watching once started, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();

-- 9c) a show in the library with nothing watched IS a watchlist entry — there is
-- no separate "not started" bucket. Checked as lena, then cleaned up.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
insert into public.user_shows (user_id, show_id) values (auth.uid(), (select id from public.shows limit 1));
select pg_temp.assert(bucket = 'watchlist', 'unstarted show is a watchlist entry, got ' || bucket)
from public.v_user_show_progress where user_id = auth.uid();
delete from public.user_shows where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- 10) stats: v_user_statistics derives counts; monthly buckets zero-filled to 12
select pg_temp.assert(episodes_watched = 4 and seconds_watched = 47*60 + 3*40*60,
  'statistics derived from base tables')
from public.v_user_statistics where user_id = auth.uid();
select pg_temp.assert(count(*) = 12, '12 monthly buckets') from public.fn_stats_by_month(auth.uid(), 'show');
select pg_temp.assert(count(*) = 12, '12 weekly buckets') from public.fn_stats_by_week(auth.uid(), 'show');
select pg_temp.assert(sum(count) = 4, 'monthly counts sum to watches') from public.fn_stats_by_month(auth.uid(), 'show');

-- 11) marathon: 4 eps of one show today
select pg_temp.assert(episodes = 4 and day = current_date, 'biggest marathon = 4 eps today')
from public.fn_biggest_marathons(auth.uid()) limit 1;

-- 12) badges: first_episode unlocked; badge notification created
select pg_temp.assert(exists (select 1 from public.user_badges
  where user_id = auth.uid() and badge_id = 'first_episode'), 'first_episode badge');
select pg_temp.assert(exists (select 1 from public.notifications
  where user_id = auth.uid() and type = 'badge_unlock'), 'badge unlock notification');

-- 13) social: lena follows naza + the same show → affinity 100, feed groups the session
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
insert into public.user_shows (user_id, show_id, followed_at)
  values (auth.uid(), (select id from public.shows limit 1), now());
insert into public.follows (follower_id, followee_id)
  values (auth.uid(), '00000000-0000-0000-0000-000000000001');
select pg_temp.assert(affinity = 100, 'affinity 100 for identical follows, got ' || affinity)
from public.follows where follower_id = auth.uid();
select pg_temp.assert(exists (select 1 from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000001' and type = 'new_follower'),
  'new follower notification');
-- naza's 4-episode burst groups into ONE watch event with episode_count 4
select pg_temp.assert(
  (select count(*) from public.fn_activity_feed(auth.uid())
   where event_type = 'watch' and actor_username = 'naza') = 1
  and (select (payload->>'episode_count')::int from public.fn_activity_feed(auth.uid())
   where event_type = 'watch' and actor_username = 'naza') = 4,
  'feed groups watch session');

-- 14) calendar honors exclusions
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select pg_temp.assert(count(*) > 0, 'calendar returns future episode')
from public.fn_upcoming_calendar(auth.uid(), current_date, current_date + 60);
update public.user_settings
  set excluded_show_ids = array[(select id from public.shows limit 1)]
  where user_id = auth.uid();
select pg_temp.assert(count(*) = 0, 'excluded show vanishes from calendar')
from public.fn_upcoming_calendar(auth.uid(), current_date, current_date + 60);

-- 15) daily connection + streak feeds badges
insert into public.user_daily_connections (user_id, day)
select auth.uid(), current_date - g from generate_series(0, 7) g;
select public.fn_check_badges(auth.uid());
select pg_temp.assert(exists (select 1 from public.user_badges
  where user_id = auth.uid() and badge_id = 'streak_7'), 'streak_7 badge');

-- 16) addiction scores recompute
select public.fn_recompute_addiction_scores();
select pg_temp.assert(weekly_score > 0, 'addiction score computed')
from public.show_addiction_scores where user_id = auth.uid();

rollback;
\echo 'SMOKE TEST PASSED'
