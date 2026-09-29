-- Base privileges for the API roles.
--
-- RLS (enabled on every table) decides *which rows* a role may touch, but a role
-- must first hold a table-level GRANT or every statement is denied before RLS is
-- consulted. Supabase's `postgres` role — which migrations run as — grants only
-- Dxt (truncate/references/trigger) to anon/authenticated by default, NOT
-- select/DML, so those must be granted explicitly here. Without this, an
-- authenticated user hits "permission denied for table user_shows" on the home
-- page. Writes to content-cache tables stay blocked by the absence of RLS
-- write policies, not by withholding the grant.

grant usage on schema public to anon, authenticated, service_role;

-- Reads: anon + authenticated on every table and view; service_role gets all.
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Materialized views aren't covered by "ALL TABLES"; Explore reads mv_trending_shows.
grant select on public.mv_trending_shows to anon, authenticated, service_role;

-- Identity/serial sequences
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- RPCs
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Re-apply the column-level restriction on notifications: clients may flip only
-- `read` (the blanket UPDATE grant above would otherwise re-open every column).
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- Maintenance/cron functions are service_role-only (they act across all users).
revoke execute on function
  public.fn_recompute_addiction_scores(),
  public.fn_refresh_affinities(),
  public.fn_refresh_trending(),
  public.fn_notify_airing_episodes()
  from anon, authenticated;

-- Keep future objects working without a repeat of this bug.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- PostgREST: refresh so the new grants are reflected immediately.
notify pgrst, 'reload schema';
