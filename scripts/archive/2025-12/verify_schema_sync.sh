#!/bin/bash
# Verify schema sync between local migrations and Supabase cloud
set -e

echo "🔍 Checking schema sync..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed"
    echo "Install: brew install supabase/tap/supabase"
    exit 1
fi

# Check for schema drift
DIFF_OUTPUT=$(supabase db diff --linked 2>&1)
DIFF_EXIT=$?

if [ $DIFF_EXIT -ne 0 ]; then
    echo "❌ Schema drift detected!"
    echo ""
    echo "$DIFF_OUTPUT"
    echo ""
    echo "🔧 To fix: supabase db push --linked"
    echo "📖 See: /docs/SUPABASE_CONNECTION_GUIDE.md"
    exit 1
fi

# Check if diff is empty
if [ -n "$DIFF_OUTPUT" ]; then
    echo "⚠️  Schema changes detected:"
    echo "$DIFF_OUTPUT"
    echo ""
    echo "🔧 Deploy with: supabase db push --linked"
    exit 1
fi

echo "✅ Schema in sync!"
exit 0
