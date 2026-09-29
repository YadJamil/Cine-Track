-- Scheduled jobs (no-op where pg_cron is unavailable; see README for manual equivalents)
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed — skipping job scheduling';
    return;
  end if;
  perform cron.schedule('episode-addiction-scores',     '30 * * * *',  'select public.fn_recompute_addiction_scores()');
  perform cron.schedule('episode-refresh-affinities',   '0 3 * * *',   'select public.fn_refresh_affinities()');
  perform cron.schedule('episode-refresh-trending',     '15 */6 * * *','select public.fn_refresh_trending()');
  perform cron.schedule('episode-airing-notifications', '0 6 * * *',   'select public.fn_notify_airing_episodes()');
end $$;
