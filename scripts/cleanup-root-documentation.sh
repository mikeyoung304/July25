#!/bin/bash
# Documentation Cleanup Script
# Moves old root-level documentation to appropriate archive directories
# Usage: ./scripts/cleanup-root-documentation.sh [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Check for dry-run mode
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${YELLOW}DRY RUN MODE - No files will be moved${NC}\n"
fi

echo -e "${BOLD}${BLUE}================================${NC}"
echo -e "${BOLD}${BLUE}Documentation Cleanup Script${NC}"
echo -e "${BOLD}${BLUE}================================${NC}\n"

# Archive base directory
ARCHIVE_BASE="docs/archive/2025-11"

# Counters
TOTAL_FILES=0
MOVED_FILES=0
SKIPPED_FILES=0

# Function to create directory
create_dir() {
    local dir=$1
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}✓ Created directory: $dir${NC}"
    else
        echo -e "${BLUE}[DRY RUN] Would create: $dir${NC}"
    fi
}

# Function to move file with ARCHIVED banner
move_with_banner() {
    local file=$1
    local target_dir=$2
    local category=$3

    TOTAL_FILES=$((TOTAL_FILES + 1))

    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠ File not found: $file${NC}"
        SKIPPED_FILES=$((SKIPPED_FILES + 1))
        return
    fi

    local basename=$(basename "$file")
    local target="$target_dir/$basename"

    if [ "$DRY_RUN" = false ]; then
        # Add ARCHIVED banner to file
        {
            echo "# ARCHIVED"
            echo ""
            echo "> **⚠️ ARCHIVED DOCUMENTATION**"
            echo "> This file has been archived on $(date +%Y-%m-%d)."
            echo "> For current documentation, see [docs/README.md](/docs/README.md)"
            echo "> Category: $category"
            echo ""
            echo "---"
            echo ""
            cat "$file"
        } > "$target"

        # Remove original
        rm "$file"

        echo -e "${GREEN}✓ Moved: $basename → $target_dir/${NC}"
        MOVED_FILES=$((MOVED_FILES + 1))
    else
        echo -e "${BLUE}[DRY RUN] Would move: $basename → $target_dir/${NC}"
    fi
}

# Function to create archive manifest
create_manifest() {
    local dir=$1
    local title=$2
    local description=$3

    local manifest="$dir/README.md"

    if [ "$DRY_RUN" = false ]; then
        {
            echo "# $title"
            echo ""
            echo "**Archived**: $(date +%Y-%m-%d)"
            echo "**Category**: $description"
            echo ""
            echo "---"
            echo ""
            echo "## Files in This Archive"
            echo ""

            # List files
            for file in "$dir"/*.md; do
                if [ -f "$file" ] && [ "$(basename "$file")" != "README.md" ]; then
                    local basename=$(basename "$file")
                    local title_line=$(head -n 20 "$file" | grep "^# " | head -n 1 | sed 's/^# //')

                    if [ -z "$title_line" ]; then
                        title_line="$basename"
                    fi

                    echo "- [$title_line](./$basename)"
                fi
            done

            echo ""
            echo "---"
            echo ""
            echo "## Retention"
            echo ""
            echo "These files are retained for historical reference and audit purposes."
            echo "Review date: $(date -v+3m +%Y-%m-%d 2>/dev/null || date -d '+3 months' +%Y-%m-%d)"
            echo ""
            echo "## Related Documentation"
            echo ""
            echo "- [Documentation Home](/docs/README.md)"
            echo "- [Archive Index](/docs/archive/README.md)"
        } > "$manifest"

        echo -e "${GREEN}✓ Created manifest: $manifest${NC}"
    else
        echo -e "${BLUE}[DRY RUN] Would create manifest: $manifest${NC}"
    fi
}

echo -e "${BLUE}Step 1: Creating archive directories...${NC}\n"

create_dir "$ARCHIVE_BASE/incidents/jwt-scope-bug"
create_dir "$ARCHIVE_BASE/phases/p0.9-phase-2b"
create_dir "$ARCHIVE_BASE/environment"
create_dir "$ARCHIVE_BASE/deployment"
create_dir "$ARCHIVE_BASE/investigations"
create_dir "$ARCHIVE_BASE/voice-websocket"

echo ""
echo -e "${BLUE}Step 2: Moving JWT Scope Bug investigation files...${NC}\n"

JWT_FILES=(
    "JWT_SCOPE_BUG_ANALYSIS_INDEX.md"
    "JWT_SCOPE_BUG_ROOT_CAUSE_ANALYSIS.md"
    "JWT_SCOPE_BUG_TECHNICAL_SUMMARY.md"
    "JWT_SCOPE_BUG_PATTERNS_AND_SOLUTIONS.md"
    "JWT_SCOPE_BUG_LESSON_IMPLEMENTATION_SUMMARY.md"
    "JWT_SCOPE_FIX_COMPLETE_SUMMARY.md"
    "AUTH_SCOPE_DETAILED_FLOW.md"
    "AUTH_SCOPE_DOCUMENTATION_INDEX.md"
    "AUTH_SCOPE_FLOW_TRACE.md"
    "AUTH_SCOPE_QUICK_REFERENCE.md"
    "AUTH_BUG_ROOT_CAUSE_ANALYSIS.md"
    "AUTH_FIX_DEPLOYMENT_SUMMARY.md"
    "AUTH_FIX_DEPLOYMENT_VERIFICATION.md"
    "AUTH_FIX_TESTED_SUCCESSFULLY.md"
    "AUTH_FIX_VERIFICATION_COMPLETE.md"
    "CRITICAL_AUTH_FIX_COMPLETED.md"
)

for file in "${JWT_FILES[@]}"; do
    move_with_banner "$file" "$ARCHIVE_BASE/incidents/jwt-scope-bug" "JWT Scope Bug Investigation"
done

create_manifest "$ARCHIVE_BASE/incidents/jwt-scope-bug" "JWT Scope Bug Investigation" "Complete investigation of JWT scope field bug (Nov 12-13, 2025)"

echo ""
echo -e "${BLUE}Step 3: Moving P0.9 Phase 2B documentation...${NC}\n"

PHASE_FILES=(
    "P0.9_AUTH_STABILIZATION_SYNTHESIS.md"
    "P0.9_DATABASE_SCHEMA_FORENSIC_AUDIT.md"
    "P0.9_DEPLOYMENT_COMPLETE_SUMMARY.md"
    "P0.9_OPERATIONAL_VERIFICATION_CHECKLIST.md"
    "P0.9_PHASE_2_PUNCHLIST.md"
    "P0.9_PHASE_2B_DATABASE_MIGRATION_ANALYSIS.md"
    "P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md"
    "P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md"
    "P0.9_PHASE_2B_SIGN_OFF_PACKAGE.md"
    "PHASE_1_VERIFICATION_COMPLETE.md"
)

for file in "${PHASE_FILES[@]}"; do
    move_with_banner "$file" "$ARCHIVE_BASE/phases/p0.9-phase-2b" "P0.9 Phase 2B"
done

create_manifest "$ARCHIVE_BASE/phases/p0.9-phase-2b" "P0.9 Phase 2B Documentation" "Phase 2B: Auth stabilization and multi-tenancy security (Nov 2025)"

echo ""
echo -e "${BLUE}Step 4: Moving environment audit files...${NC}\n"

ENV_FILES=(
    "ENV_FILES_AUDIT.md"
    "ENVIRONMENT_AUDIT_SUMMARY_AND_PLAN_2025-11-11.md"
    "ENVIRONMENT_FILES_DEEP_AUDIT_2025-11-11.md"
    "ENVIRONMENT_VARIABLE_AUDIT_2025-11-11.md"
    "RENDER_BACKEND_AUDIT_2025-11-11.md"
    "STAGING_TESTING_DATABASE_INFRASTRUCTURE_AUDIT.md"
    "STAGING_TESTING_DATABASE_QUICK_REFERENCE.md"
    "DATABASE_AUDIT_EXECUTIVE_SUMMARY.md"
)

for file in "${ENV_FILES[@]}"; do
    move_with_banner "$file" "$ARCHIVE_BASE/environment" "Environment Audits"
done

create_manifest "$ARCHIVE_BASE/environment" "Environment Configuration Audits" "Environment variable and configuration audits (Nov 2025)"

echo ""
echo -e "${BLUE}Step 5: Moving deployment documentation...${NC}\n"

DEPLOY_FILES=(
    "RENDER_BACKEND_ROOT_CAUSE_ANALYSIS.md"
    "RENDER_ENV_FIX_GUIDE.md"
    "RENDER_MANUAL_DEPLOY_GUIDE.md"
    "PRODUCTION_HARDENING_EXECUTIVE_REPORT_2025-11-11.md"
    "PRODUCTION_SERVERVIEW_TEST_REPORT.md"
    "DEMO_USERS_SETUP_COMPLETE.md"
    "DATABASE_AUDIT_QUICK_ACTIONS.md"
)

for file in "${DEPLOY_FILES[@]}"; do
    move_with_banner "$file" "$ARCHIVE_BASE/deployment" "Deployment Documentation"
done

create_manifest "$ARCHIVE_BASE/deployment" "Deployment Documentation" "Deployment guides and reports (Nov 2025)"

echo ""
echo -e "${BLUE}Step 6: Moving investigation files...${NC}\n"

INVESTIGATION_FILES=(
    "AFFECTED_FILES_INDEX.md"
    "AI_AGENT_MISTAKE_ANALYSIS.md"
    "ARCHITECTURAL_ANALYSIS_INDEX.md"
    "AUTH_WEBSOCKET_MULTITENANCY_AUDIT.md"
    "BUG_REPORT_2025-01-12.md"
    "CRITICAL_FIX_CLIENT_AUTH.md"
    "DOCUMENTATION_CLEANUP_REPORT.md"
    "FRONTEND_BACKEND_INTEGRATION_ANALYSIS.md"
    "HANDOFF_NEXT_AGENT_2025-11-11.md"
    "HANDOFF_SUMMARY_2025-11-11.md"
    "README_MEMORY_LEAK_INVESTIGATION.md"
    "ROOT_CAUSE_ANALYSIS_SCREENSHOTS.md"
    "TIMER_AUDIT_INDEX.md"
    "URGENT_FIX_GUIDE.md"
    "TOUCH_ORDERING_CART_BUG_ANALYSIS.md"
)

for file in "${INVESTIGATION_FILES[@]}"; do
    move_with_banner "$file" "$ARCHIVE_BASE/investigations" "Investigations"
done

create_manifest "$ARCHIVE_BASE/investigations" "Technical Investigations" "Various technical investigations and analyses (Nov 2025)"

echo ""
echo -e "${BLUE}Step 7: Moving voice/websocket files...${NC}\n"

VOICE_FILES=(
    "VOICE_INVESTIGATION_INDEX.md"
    "VOICE_ORDER_ANALYSIS_SUMMARY.md"
    "WEBSOCKET_DISCONNECTION_ROOT_CAUSE_ANALYSIS.md"
    "WEBSOCKET_INVESTIGATION_INDEX.md"
)

for file in "${VOICE_FILES[@]}"; do
    move_with_banner "$file" "$ARCHIVE_BASE/voice-websocket" "Voice & WebSocket"
done

create_manifest "$ARCHIVE_BASE/voice-websocket" "Voice & WebSocket Investigations" "Voice ordering and WebSocket investigations (Nov 2025)"

# Summary
echo ""
echo -e "${BOLD}${BLUE}================================${NC}"
echo -e "${BOLD}${BLUE}Cleanup Summary${NC}"
echo -e "${BOLD}${BLUE}================================${NC}\n"

echo -e "Total files processed: $TOTAL_FILES"
echo -e "${GREEN}Moved: $MOVED_FILES${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED_FILES${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE - No files were actually moved${NC}"
    echo -e "${YELLOW}Run without --dry-run to execute the cleanup${NC}"
else
    echo -e "${GREEN}✓ Cleanup complete!${NC}"
    echo ""
    echo -e "Archive location: ${BLUE}$ARCHIVE_BASE/${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Review archived files in $ARCHIVE_BASE/"
    echo -e "  2. Update docs/postmortems/2025-11-12-jwt-scope-bug.md with archive links"
    echo -e "  3. Update docs/archive/README.md with November 2025 summary"
    echo -e "  4. Verify remaining root-level files (should be < 10)"
fi

echo ""

# Count remaining root files
REMAINING=$(find . -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')
echo -e "Root-level .md files remaining: ${BOLD}$REMAINING${NC}"

if [ $REMAINING -lt 10 ]; then
    echo -e "${GREEN}✓ Target achieved (< 10 files at root)${NC}"
else
    echo -e "${YELLOW}⚠ Still above target of 10 files${NC}"
fi
