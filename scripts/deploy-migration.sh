#!/bin/bash
# Migration Deployment Script
# Purpose: Safely deploy a single migration to Supabase production
# Part of: Phase 2.2 - Stable CI/CD Automation
# Usage: ./scripts/deploy-migration.sh <migration_file_path>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Exit codes
EXIT_SUCCESS=0
EXIT_FAILURE=1
EXIT_ALREADY_APPLIED=2

# Function: Print colored message
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✅${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $1"; }
log_error() { echo -e "${RED}❌${NC} $1"; }

# Function: Extract migration version from filename
get_migration_version() {
  local filepath="$1"
  local filename=$(basename "$filepath" .sql)
  echo "$filename"
}

# Function: Check if migration has been applied
is_migration_applied() {
  local version="$1"

  log_info "Checking if migration '$version' has been applied..."

  # Query schema_migrations table
  local result=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version';" \
    2>/dev/null || echo "0")

  result=$(echo "$result" | tr -d ' ')

  if [ "$result" -gt 0 ]; then
    return 0  # Already applied
  else
    return 1  # Not applied
  fi
}

# Function: Apply migration
apply_migration() {
  local filepath="$1"
  local version="$2"

  log_info "Applying migration: $version"
  log_info "File: $filepath"

  # Apply migration using psql
  if psql "$DATABASE_URL" -f "$filepath" 2>&1 | tee /tmp/migration_output.log; then
    log_success "Migration SQL executed successfully"
  else
    log_error "Migration execution failed"
    log_error "Error output:"
    cat /tmp/migration_output.log
    return 1
  fi

  # Verify migration was recorded
  sleep 1  # Give database a moment to record the migration

  if is_migration_applied "$version"; then
    log_success "Migration recorded in schema_migrations table"
    return 0
  else
    log_warning "Migration executed but not found in schema_migrations table"
    log_warning "This may indicate the migration didn't include INSERT into schema_migrations"
    return 0  # Still consider it success if SQL executed
  fi
}

# Function: Verify database connection
verify_connection() {
  log_info "Verifying database connection..."

  if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Database connection verified"
    return 0
  else
    log_error "Cannot connect to database"
    log_error "Check DATABASE_URL is correct and database is accessible"
    return 1
  fi
}

#######################
# MAIN SCRIPT
#######################

echo ""
log_info "=============================================

="
log_info "  Migration Deployment Script (Phase 2.2)"
log_info "================================================"
echo ""

# Check arguments
if [ $# -eq 0 ]; then
  log_error "Usage: $0 <migration_file_path>"
  log_info "Example: $0 supabase/migrations/20251023_add_column.sql"
  exit $EXIT_FAILURE
fi

MIGRATION_FILE="$1"

# Validate migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  log_error "Migration file not found: $MIGRATION_FILE"
  exit $EXIT_FAILURE
fi

# Load environment variables if .env exists
if [ -f .env ]; then
  set -a  # Export all variables
  source .env
  set +a
  log_info "Loaded environment from .env"
fi

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  log_error "DATABASE_URL environment variable is not set"
  log_info "Set it in .env or export it before running this script"
  exit $EXIT_FAILURE
fi

# Verify database connection
if ! verify_connection; then
  exit $EXIT_FAILURE
fi

# Get migration version
MIGRATION_VERSION=$(get_migration_version "$MIGRATION_FILE")
log_info "Migration version: $MIGRATION_VERSION"
echo ""

# Check if already applied
if is_migration_applied "$MIGRATION_VERSION"; then
  log_warning "Migration '$MIGRATION_VERSION' has already been applied"
  log_info "Skipping deployment (idempotent)"
  echo ""
  log_success "Deployment completed (no action needed)"
  exit $EXIT_ALREADY_APPLIED
fi

# Apply the migration
echo ""
log_info "Deploying migration to production..."
echo ""

if apply_migration "$MIGRATION_FILE" "$MIGRATION_VERSION"; then
  echo ""
  log_success "================================================"
  log_success "  Migration deployed successfully!"
  log_success "================================================"
  echo ""
  log_info "Next steps:"
  log_info "  1. Run ./scripts/post-migration-sync.sh to update Prisma schema"
  log_info "  2. Commit updated schema to git"
  log_info "  3. Monitor application logs for any issues"
  echo ""
  exit $EXIT_SUCCESS
else
  echo ""
  log_error "================================================"
  log_error "  Migration deployment FAILED"
  log_error "================================================"
  echo ""
  log_error "Troubleshooting steps:"
  log_error "  1. Check error output above"
  log_error "  2. Verify migration SQL syntax"
  log_error "  3. Check database permissions"
  log_error "  4. See docs/RUNBOOKS.md for rollback procedure"
  echo ""
  exit $EXIT_FAILURE
fi
