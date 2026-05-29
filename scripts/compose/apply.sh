#!/usr/bin/env bash
# Docker Compose DB-only initializer. Runs once, inside the stock postgres container, via
# /docker-entrypoint-initdb.d. Stands up the Supabase-managed surface (bootstrap.sql), applies
# every Cornerstone migration in order (stripping cloud-only CREATE EXTENSION lines that the
# stock image can't satisfy — pgmq/supabase_vault are stubbed by bootstrap.sql), then loads the
# synthetic seed. See docs/dev-setup.md "Path B".
set -euo pipefail

PSQL=(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q)
ROOT=/repo

echo "[apply] bootstrap (Supabase-surface stubs)…"
"${PSQL[@]}" -f "$ROOT/scripts/compose/bootstrap.sql"

echo "[apply] migrations…"
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  echo "[apply]   $(basename "$f")"
  # Strip cloud-only extensions (stubbed in bootstrap.sql); pgcrypto stays (stock image has it).
  sed -E 's/^[[:space:]]*CREATE EXTENSION (IF NOT EXISTS )?(pg_cron|pg_net|pgmq|supabase_vault).*$/-- (compose: stubbed extension)/' "$f" \
    | "${PSQL[@]}" -f -
done

echo "[apply] seed…"
( cd "$ROOT" && "${PSQL[@]}" -f supabase/seed.sql )

echo "[apply] done — schema + synthetic seed loaded."
