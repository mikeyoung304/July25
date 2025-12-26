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
    echo "## DB Evidence: Optimistic Locking Column"
    echo ""
    echo "Check for orders.version column:"
    echo '```sql'
    echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders' AND column_name='version';"
    echo '```'
    echo ""
    echo "Result:"
    echo '```'
    runq "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders' AND column_name='version';"
    echo '```'
  } > "$OUT" 2>&1
  gh issue comment "$NUM" --body-file "$OUT"
fi

# STAB-003: restaurants.tax_rate exists?
NUM=$(jq -r '.[] | select(.id=="STAB-003") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${NUM:-}" ]; then
  OUT="artifacts/evidence/STAB-003-db.txt"
  {
    echo "## DB Evidence: Tax Rate Configuration Column"
    echo ""
    echo "Check for restaurants.tax_rate column:"
    echo '```sql'
    echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='restaurants' AND column_name='tax_rate';"
    echo '```'
    echo ""
    echo "Result:"
    echo '```'
    runq "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='restaurants' AND column_name='tax_rate';"
    echo '```'
  } > "$OUT" 2>&1
  gh issue comment "$NUM" --body-file "$OUT"
fi

# Performance quick win: indexes on orders (if audit suggested)
NUM=$(jq -r '.[] | select(.id=="OPT-003") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${NUM:-}" ]; then
  OUT="artifacts/evidence/OPT-003-db.txt"
  {
    echo "## DB Evidence: Index Inventory for Orders Table"
    echo ""
    echo "Query for existing indexes on orders table:"
    echo '```sql'
    echo "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='orders';"
    echo '```'
    echo ""
    echo "Result:"
    echo '```'
    runq "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='orders';"
    echo '```'
  } > "$OUT" 2>&1
  gh issue comment "$NUM" --body-file "$OUT"
fi

echo "DB evidence comments posted."
