#!/bin/bash
# Post-Migration Schema Sync
# Purpose: Keep Prisma schema in sync with database after migrations
# Usage: Run after deploying database migrations to Supabase
# Part of: World-Class Database Migration System (Phase 1.2)

set -e

echo "🔄 Post-Migration Schema Sync Starting..."
echo ""

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✓ Loaded environment from .env"
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "   Make sure .env file exists with DATABASE_URL"
  exit 1
fi

echo "✓ DATABASE_URL configured"
echo ""

# Step 1: Pull latest schema from database
echo "📥 Introspecting database schema..."
npx prisma db pull

if [ $? -ne 0 ]; then
  echo "❌ Schema introspection failed"
  exit 1
fi

echo "✓ Schema introspection complete"
echo ""

# Step 2: Generate TypeScript types
echo "🔨 Generating TypeScript types..."
npx prisma generate

if [ $? -ne 0 ]; then
  echo "❌ Type generation failed"
  exit 1
fi

echo "✓ TypeScript types generated"
echo ""

# Step 3: Show what changed (if git is available)
if command -v git &> /dev/null; then
  if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "📊 Schema changes:"
    git diff --stat prisma/schema.prisma || echo "   No changes detected"
    echo ""
  fi
fi

echo "✅ Post-Migration Schema Sync Complete!"
echo ""
echo "Next steps:"
echo "  1. Review changes in prisma/schema.prisma"
echo "  2. Commit updated schema to git"
echo "  3. Deploy updated types to production"
