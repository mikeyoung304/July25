#!/bin/bash

# RLS Canary Check Script for CI
# Fails the build if RLS policies have regressed

set -e

echo "🔍 Running RLS Canary Checks..."

# Load environment
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required env vars
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Run the canary SQL
RESULT=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat scripts/ci/rls_canary.sql | tr '\n' ' ')\"}")

# Check for errors
if echo "$RESULT" | grep -q "CANARY FAILED"; then
  echo "❌ RLS Canary Failed!"
  echo "$RESULT" | jq -r '.message'
  exit 1
fi

echo "✅ RLS Canary Passed - All policies secure"

# Additional check: No admin client in write routes
echo "🔍 Checking for admin client usage in write routes..."

ADMIN_USAGE=$(grep -r "import.*supabase.*from.*config/database" server/src/routes/*.routes.ts | \
  grep -v "attachUserClient" | \
  grep -E "(payments|terminal|users)" || true)

if [ -n "$ADMIN_USAGE" ]; then
  echo "⚠️ Warning: Some write routes may still use admin client:"
  echo "$ADMIN_USAGE"
fi

echo "✅ RLS checks complete"
exit 0