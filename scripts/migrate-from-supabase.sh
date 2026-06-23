#!/usr/bin/env bash
set -euo pipefail

# Copy existing OpenMic data from Supabase Postgres into a new Postgres (e.g. Neon).
# Both are stock Postgres, so this is a plain pg_dump | psql of just the app's data
# tables — Supabase's auth/storage/RLS/triggers are skipped.
#
# Usage:
#   SUPABASE_DB_URL=postgres://...   # Supabase DIRECT connection string (NOT the pooler)
#   NEON_DB_URL=postgres://...       # target Postgres connection string
#   ./scripts/migrate-from-supabase.sh
#
# Requires pg_dump and psql (Postgres client tools) on your PATH.

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to your Supabase direct connection string}"
: "${NEON_DB_URL:?Set NEON_DB_URL to your target Postgres connection string}"

echo "==> Creating schema in target database..."
DATABASE_URL="$NEON_DB_URL" npm run db:migrate

echo "==> Copying data (people, open_mic_dates, sign_ups, cancellation_history)..."
pg_dump --data-only --no-owner --no-privileges \
  -t public.people \
  -t public.open_mic_dates \
  -t public.sign_ups \
  -t public.cancellation_history \
  "$SUPABASE_DB_URL" | psql "$NEON_DB_URL"

echo "==> Done. Spot-check row counts in the new database before switching DATABASE_URL."
