#!/bin/bash
# Migration Rollback Script
# Purpose: Emergency rollback of database migrations
# Part of: Phase 2.5 - Stable CI/CD Automation
# Usage: ./scripts/rollback-migration.sh <migration_name_or_timestamp>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✅${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $1"; }
log_error() { echo -e "${RED}❌${NC} $1"; }

#######################
# FUNCTIONS
#######################

# Find migration file by name or timestamp
find_migration() {
  local query="$1"

  # Try exact match first
  if [ -f "supabase/migrations/${query}.sql" ]; then
    echo "supabase/migrations/${query}.sql"
    return 0
  fi

  # Try pattern match
  local matches=$(ls supabase/migrations/${query}*.sql 2>/dev/null | head -1)
  if [ -n "$matches" ]; then
    echo "$matches"
    return 0
  fi

  return 1
}

# Check if rollback file exists
find_rollback_file() {
  local migration_file="$1"
  local basename=$(basename "$migration_file" .sql)
  local rollback_file="supabase/migrations/${basename}.rollback.sql"

  if [ -f "$rollback_file" ]; then
    echo "$rollback_file"
    return 0
  fi

  return 1
}

# Display Supabase backup instructions
show_backup_instructions() {
  echo ""
  log_warning "================================================"
  log_warning "  No Rollback File Found"
  log_warning "================================================"
  echo ""
  log_info "This migration does not have an automated rollback file."
  echo ""
  log_info "To rollback, you have two options:"
  echo ""
  echo "Option 1: Restore from Supabase Backup"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. Go to Supabase Dashboard: https://app.supabase.com"
  echo "2. Select your project"
  echo "3. Navigate to Database → Backups"
  echo "4. Choose a backup from before the migration was applied"
  echo "5. Click 'Restore'"
  echo ""
  log_warning "WARNING: This will restore the entire database!"
  log_warning "Any data changes after the backup will be lost!"
  echo ""
  echo "Option 2: Manual Rollback SQL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. Review the migration file to understand what changed"
  echo "2. Write SQL to reverse those changes"
  echo "3. Save as: $ROLLBACK_FILE"
  echo "4. Run this script again"
  echo ""
  log_info "Example rollback SQL:"
  echo ""
  echo "  -- Rollback for: Add new column"
  echo "  ALTER TABLE my_table DROP COLUMN IF EXISTS new_column;"
  echo ""
  echo "  -- Rollback for: Create table"
  echo "  DROP TABLE IF EXISTS new_table;"
  echo ""
  echo "  -- Remove from migration tracking"
  echo "  DELETE FROM supabase_migrations.schema_migrations"
  echo "  WHERE version = '${MIGRATION_VERSION}';"
  echo ""
}

# Apply rollback
apply_rollback() {
  local rollback_file="$1"

  log_warning "================================================"
  log_warning "  CONFIRM ROLLBACK"
  log_warning "================================================"
  echo ""
  log_warning "You are about to apply rollback: $rollback_file"
  log_warning "This will modify the production database!"
  echo ""
  log_info "Migration being rolled back: $MIGRATION_FILE"
  echo ""
  read -p "Type 'ROLLBACK' to confirm: " confirmation

  if [ "$confirmation" != "ROLLBACK" ]; then
    log_error "Rollback cancelled"
    exit 1
  fi

  echo ""
  log_info "Applying rollback..."
  echo ""

  if psql "$DATABASE_URL" -f "$rollback_file" 2>&1 | tee /tmp/rollback_output.log; then
    log_success "Rollback SQL executed successfully"
  else
    log_error "Rollback execution failed!"
    log_error "Check output above for details"
    exit 1
  fi

  echo ""
  log_success "================================================"
  log_success "  Rollback Complete"
  log_success "================================================"
  echo ""
  log_info "Next steps:"
  log_info "  1. Verify application is working correctly"
  log_info "  2. Run ./scripts/post-migration-sync.sh to update Prisma"
  log_info "  3. Check database for any inconsistencies"
  log_info "  4. Create GitHub issue documenting the incident"
  echo ""
}

#######################
# MAIN SCRIPT
#######################

echo ""
log_warning "================================================"
log_warning "  Migration Rollback Script (Phase 2.5)"
log_warning "================================================"
echo ""
log_warning "⚠️  WARNING: Rollback operations are dangerous!"
log_warning "Only use this in emergency situations."
echo ""

# Check arguments
if [ $# -eq 0 ]; then
  log_error "Usage: $0 <migration_name_or_timestamp>"
  echo ""
  log_info "Examples:"
  log_info "  $0 20251023_add_column"
  log_info "  $0 20251023"
  echo ""
  log_info "Available migrations:"
  ls -1 supabase/migrations/*.sql | grep -v rollback | while read -r file; do
    basename=$(basename "$file" .sql)
    echo "  - $basename"
  done
  echo ""
  exit 1
fi

MIGRATION_QUERY="$1"

# Load environment
if [ -f .env ]; then
  set -a  # Export all variables
  source .env
  set +a
  log_info "Loaded environment from .env"
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  log_error "DATABASE_URL not set"
  exit 1
fi

# Find migration file
log_info "Searching for migration: $MIGRATION_QUERY"
if MIGRATION_FILE=$(find_migration "$MIGRATION_QUERY"); then
  log_success "Found migration: $MIGRATION_FILE"
  MIGRATION_VERSION=$(basename "$MIGRATION_FILE" .sql)
else
  log_error "Migration not found: $MIGRATION_QUERY"
  exit 1
fi

# Look for rollback file
log_info "Checking for rollback file..."
if ROLLBACK_FILE=$(find_rollback_file "$MIGRATION_FILE"); then
  log_success "Found rollback file: $ROLLBACK_FILE"
  echo ""
  apply_rollback "$ROLLBACK_FILE"
else
  show_backup_instructions
  exit 1
fi
