#!/usr/bin/env bash
# Replays every migration + the behavioral smoke test against a plain Postgres.
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${EPISODE_TEST_DB:-episode_test}"

dropdb --if-exists "$DB"
createdb "$DB"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f scripts/pg-shim.sql
for f in supabase/migrations/*.sql; do
  echo "── $f"
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
done
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
psql -d "$DB" -v ON_ERROR_STOP=1 -f scripts/db-smoke-test.sql | tail -1
