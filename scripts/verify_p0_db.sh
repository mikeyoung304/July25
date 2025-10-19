#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL not set}"

MAP="docs/audits/verification-map-P0.json"
[ -f "$MAP" ] || { echo "Missing $MAP"; exit 1; }

runq () { psql "$DATABASE_URL" -X --tuples-only --no-align -c "$1"; }

# STAB-002: orders.version exists?
NUM=$(jq -r '.[] | select(.id=="STAB-002") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${NUM:-}" ]; then
  OUT="artifacts/evidence/STAB-002-db.txt"
  {
    echo "Check orders.version column"
    runq "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders' AND column_name='version';"
  } > "$OUT" 2>&1
  gh issue comment "$NUM" --body "DB schema check for optimistic locking:" --body-file "$OUT"
fi

# STAB-003: restaurants.tax_rate exists?
NUM=$(jq -r '.[] | select(.id=="STAB-003") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${NUM:-}" ]; then
  OUT="artifacts/evidence/STAB-003-db.txt"
  {
    echo "Check restaurants.tax_rate column"
    runq "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='restaurants' AND column_name='tax_rate';"
  } > "$OUT" 2>&1
  gh issue comment "$NUM" --body "DB schema check for per-restaurant tax rate:" --body-file "$OUT"
fi

# Performance quick win: indexes on orders (if audit suggested)
NUM=$(jq -r '.[] | select(.id=="OPT-003") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${NUM:-}" ]; then
  OUT="artifacts/evidence/OPT-003-db.txt"
  {
    echo "Existing indexes on orders"
    runq "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='orders';"
  } > "$OUT" 2>&1
  gh issue comment "$NUM" --body "Index inventory for orders table:" --body-file "$OUT"
fi

echo "DB evidence comments posted."
