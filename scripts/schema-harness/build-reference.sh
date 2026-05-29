#!/usr/bin/env bash
# Regenerate the authoritative Lovable reference schema (supabase/reference/lovable_public_schema.sql)
# by applying the full Lovable migration chain to a throwaway Postgres database.
#
# This is the ADR-001 schema-diff baseline: clean Cornerstone baseline migrations are verified by
# applying them and diffing the resulting public schema against this reference.
#
# Why a stub harness: the dev sandbox cannot pull Supabase container images (open_questions B-A1),
# so `bootstrap.sql` emulates the Supabase-managed surface (auth/vault/cron/net/pgmq/storage/
# realtime) on stock Postgres. Only the `public` schema is dumped, which is identical to what a
# real Supabase instance would produce. CI verifies on the real Supabase stack regardless.
#
# Usage (requires the Lovable source on the `lovable-source` branch + a local Postgres):
#   scripts/schema-harness/build-reference.sh
set -euo pipefail

DB="${1:-lovable_full}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$HERE/../.." && pwd)/supabase/reference/lovable_public_schema.sql"
MIGS_TMP="$(mktemp)"

# Concatenate the Lovable migrations, stripping cloud-only CREATE EXTENSION lines (stubbed below).
for f in $(git ls-tree -r --name-only origin/lovable-source -- supabase/migrations | sort); do
  git show "origin/lovable-source:$f"
  echo
done | sed -E 's/^[[:space:]]*CREATE EXTENSION (IF NOT EXISTS )?(pg_cron|pg_net|pgmq|supabase_vault).*$/-- (local: stubbed extension)/' > "$MIGS_TMP"

sudo -u postgres psql -q -c "DROP DATABASE IF EXISTS ${DB};" -c "CREATE DATABASE ${DB};"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$HERE/bootstrap.sql"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$MIGS_TMP"
sudo -u postgres pg_dump -d "$DB" --schema-only --schema=public --no-owner --no-privileges > "$OUT"
rm -f "$MIGS_TMP"
echo "Wrote $OUT ($(wc -l < "$OUT") lines)."
