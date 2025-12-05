#!/bin/bash
# Migration History Verification Script
# Purpose: Verify local and remote migration history are in sync
# Part of: Phase 1.3 - Migration history baseline and repair

set -e

echo "🔍 Migration History Verification"
echo "=================================="
echo ""

# Load environment variables
if [ -f .env ]; then
  set -a  # Export all variables
  source .env
  set +a
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo "   Make sure .env file exists with DATABASE_URL"
  exit 1
fi

echo "✓ DATABASE_URL configured"
echo ""

# Count local migrations
LOCAL_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "📁 Local migrations: $LOCAL_COUNT files"
echo ""

# List local migrations with timestamps
echo "Local migration files:"
ls -1 supabase/migrations/*.sql | while read -r file; do
  filename=$(basename "$file" .sql)
  echo "  - $filename"
done
echo ""

# Check remote migrations (if connection available)
echo "🌐 Checking remote migrations..."
REMOTE_MIGRATIONS=$(timeout 5s bash -c "echo \"SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;\" | psql \"$DATABASE_URL\" -t" 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✓ Remote connection successful"
  echo ""
  echo "Remote tracked migrations:"
  echo "$REMOTE_MIGRATIONS" | while read -r line; do
    if [ -n "$line" ]; then
      echo "  - $line"
    fi
  done
  echo ""

  # Count remote migrations
  REMOTE_COUNT=$(echo "$REMOTE_MIGRATIONS" | grep -v '^[[:space:]]*$' | wc -l | tr -d ' ')
  echo "📊 Remote tracked migrations: $REMOTE_COUNT"
  echo ""

  # Compare counts
  if [ "$LOCAL_COUNT" -eq "$REMOTE_COUNT" ]; then
    echo "✅ Migration counts match!"
  else
    echo "⚠️  Migration count mismatch:"
    echo "   Local:  $LOCAL_COUNT"
    echo "   Remote: $REMOTE_COUNT"
    echo ""
    echo "This is expected if migrations are pending deployment."
    echo "Run 'supabase db push --linked' to deploy pending migrations."
  fi
else
  echo "⚠️  Cannot connect to remote database"
  echo "   This is okay - verification requires database access"
  echo "   Try again when connection is available"
fi

echo ""
echo "=================================="
echo "Baseline Migration: 20250713130722_remote_schema.sql"
echo "See: supabase/MIGRATION_BASELINE.md for details"
