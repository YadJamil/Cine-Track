-- Minimal Supabase-environment shim so migrations replay on PLAIN PostgreSQL
-- (CI / machines without Docker). NOT used on real Supabase — there these
-- objects already exist. Run before the migrations:
--   psql -f scripts/pg-shim.sql && for f in supabase/migrations/*.sql; do psql -f "$f"; done
do $$ begin create role anon nologin;          exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin;  exception when duplicate_object then null; end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Supabase resolves auth.uid() from the JWT; the shim reads a session GUC:
--   set request.jwt.claim.sub = '<uuid>';
create or replace function auth.uid() returns uuid
language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
