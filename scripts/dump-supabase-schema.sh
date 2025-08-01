#!/bin/bash

# Claude-Code : Supabase cloud schema + RLS dump
#
# ❶  When asked for input, paste your full Postgres URI
#    (replace <PASTE-URI-HERE> below) and press Enter.
# ❷  Wait for the two "Dump complete" messages.
# ❸  The script prints two file paths; click them to download.
# ❹  After download, go reset the DB password in the Dashboard.

read -p "🔑  Paste your full Postgres URI (ends with .../postgres): " PGURL

# sanity-check: fatal on blank
if [ -z "$PGURL" ]; then
  echo "❌  No URI supplied. Abort." && exit 1
fi

echo "🔍  Checking for pg_dump..."
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found, installing with Homebrew..."
  brew install postgresql || { echo "Install failed"; exit 1; }
fi

OUTDIR=/tmp/supabase-dump-$(date +%s)
mkdir -p "$OUTDIR"

echo "📥  Dumping full DDL to $OUTDIR/supabase_schema.sql ..."
PGPASSWORD=$(echo "$PGURL" | sed -E 's#.*://.*:(.*)@.*#\1#')
export PGPASSWORD
pg_dump "$PGURL?sslmode=require" --schema=public --no-owner --no-privileges \
        --file "$OUTDIR/supabase_schema.sql" || { echo "❌ pg_dump DDL failed"; exit 1; }

echo "📥  Dumping RLS policies to $OUTDIR/supabase_rls.sql ..."
pg_dump "$PGURL?sslmode=require" --schema=public \
        --section=pre-data --section=post-data --no-owner \
        --file "$OUTDIR/supabase_rls.sql" || { echo "❌ pg_dump RLS failed"; exit 1; }

unset PGPASSWORD PGURL
echo -e "\n✅  Dump complete."
echo "  • Schema  : $OUTDIR/supabase_schema.sql"
echo "  • RLS     : $OUTDIR/supabase_rls.sql"
echo -e "\nClick the paths above to download. Remember to reset your DB password afterwards."