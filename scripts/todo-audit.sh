#!/bin/bash

# todo-audit.sh
# Purpose: Weekly audit of TODO system health and stale items
# Usage: ./scripts/todo-audit.sh

set -e

MAIN_REPO=$(cd "$(dirname "$0")/../" && pwd)
TODO_DIR=".claude/todos"
SOLUTION_DIR=".claude/solutions"

echo "=== TODO System Audit ==="
echo "Date: $(date)"
echo ""

cd "$MAIN_REPO"

# Counter variables
TOTAL_TODOS=0
PENDING_TODOS=0
IN_PROGRESS=0
STALE_TODOS=0
INVALID_TODOS=0
DUPLICATES=0
TOTAL_SOLUTIONS=0
WEEK_SOLUTIONS=0

echo "Step 1: Scanning TODO files..."

# Analyze TODO status
if [ -d "$TODO_DIR" ]; then
    find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
        TOTAL_TODOS=$((TOTAL_TODOS + 1))
        BASENAME=$(basename "$todo_file")

        # Extract status
        STATUS=$(grep "^status:" "$todo_file" 2>/dev/null | awk -F: '{print $2}' | xargs || echo "unknown")

        # Check age
        MODIFIED=$(stat -f %m "$todo_file" 2>/dev/null || stat -c %Y "$todo_file" 2>/dev/null)
        TODAY=$(date +%s)
        AGE_DAYS=$(( (TODAY - MODIFIED) / 86400 ))

        # Categorize
        case "$STATUS" in
            "pending")
                PENDING_TODOS=$((PENDING_TODOS + 1))
                if [ "$AGE_DAYS" -gt 30 ]; then
                    STALE_TODOS=$((STALE_TODOS + 1))
                    echo "  ⚠ STALE (${AGE_DAYS}d): $BASENAME"
                fi
                ;;
            "in_progress")
                IN_PROGRESS=$((IN_PROGRESS + 1))
                if [ "$AGE_DAYS" -gt 14 ]; then
                    echo "  ⚠ BLOCKED (${AGE_DAYS}d): $BASENAME"
                fi
                ;;
            "completed")
                echo "  ⚠ COMPLETED in pending: $BASENAME (should be archived)"
                INVALID_TODOS=$((INVALID_TODOS + 1))
                ;;
            *)
                echo "  ✗ INVALID status: $BASENAME ($STATUS)"
                INVALID_TODOS=$((INVALID_TODOS + 1))
                ;;
        esac
    done
fi

echo ""
echo "Step 2: Checking for duplicates..."

# Check for duplicate filenames across directories
if [ -d "$TODO_DIR" ]; then
    find "$TODO_DIR" -name "*.md" -type f -exec basename {} \; | \
        sort | uniq -d | while read dup; do
            if [ -n "$dup" ]; then
                DUPLICATES=$((DUPLICATES + 1))
                echo "  ⚠ Duplicate: $dup"
                find "$TODO_DIR" "$SOLUTION_DIR" -name "$dup" 2>/dev/null
            fi
        done

    if [ "$DUPLICATES" -eq 0 ]; then
        echo "  ✓ No duplicates detected"
    fi
fi

echo ""
echo "Step 3: Analyzing solutions..."

# Count solutions by age
if [ -d "$SOLUTION_DIR" ]; then
    TOTAL_SOLUTIONS=$(find "$SOLUTION_DIR" -name "*.md" -type f 2>/dev/null | wc -l)

    # Count solutions from last 7 days
    WEEK_AGO=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || \
               date -v-7d +%Y-%m-%d 2>/dev/null || \
               date -d "7 days ago" "+%Y-%m-%d" 2>/dev/null)

    WEEK_SOLUTIONS=$(find "$SOLUTION_DIR" -name "*.md" \
        -newer <(touch -d "$WEEK_AGO" /tmp/week_marker 2>/dev/null && cat /tmp/week_marker) \
        -type f 2>/dev/null | wc -l || echo 0)

    echo "  Total archived solutions: $TOTAL_SOLUTIONS"
    echo "  Completed this week: $WEEK_SOLUTIONS"
fi

echo ""
echo "Step 4: Validation checks..."

# Check for TODO files without required fields
MISSING_REQUIRED=0
if [ -d "$TODO_DIR" ]; then
    find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
        BASENAME=$(basename "$todo_file")

        # Check for required fields
        MISSING=""
        grep -q "^status:" "$todo_file" || MISSING="$MISSING status"
        grep -q "^created:" "$todo_file" || MISSING="$MISSING created"

        if [ -n "$MISSING" ]; then
            echo "  ⚠ Missing fields in $BASENAME:$MISSING"
            MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
        fi
    done
fi

echo ""
echo "Step 5: Directory organization..."

# Check subdirectory structure
SUBDIRS=$(find "$TODO_DIR" -maxdepth 1 -type d ! -name "$TODO_DIR" 2>/dev/null | wc -l)
FILES_IN_ROOT=$(find "$TODO_DIR" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)

echo "  Subdirectories: $SUBDIRS"
echo "  Files in root: $FILES_IN_ROOT"

if [ "$FILES_IN_ROOT" -gt 0 ]; then
    echo "  ⚠ Found TODO files in root (should be in subdirectories)"
    find "$TODO_DIR" -maxdepth 1 -name "*.md" -type f | xargs -I {} basename {}
fi

echo ""
echo "=== Audit Summary ==="
echo ""
echo "Active TODOs:"
echo "  Total: $TOTAL_TODOS"
echo "  Pending: $PENDING_TODOS"
echo "  In Progress: $IN_PROGRESS"
echo "  Stale (>30d): $STALE_TODOS"
echo ""
echo "Quality Issues:"
echo "  Invalid status: $INVALID_TODOS"
echo "  Missing fields: $MISSING_REQUIRED"
echo "  Duplicate files: $DUPLICATES"
echo ""
echo "Solutions:"
echo "  Total archived: $TOTAL_SOLUTIONS"
echo "  Completed this week: $WEEK_SOLUTIONS"
echo ""

# Health score
HEALTH=100
[ "$STALE_TODOS" -gt 0 ] && HEALTH=$((HEALTH - 10))
[ "$INVALID_TODOS" -gt 0 ] && HEALTH=$((HEALTH - 20))
[ "$DUPLICATES" -gt 0 ] && HEALTH=$((HEALTH - 15))
[ "$MISSING_REQUIRED" -gt 0 ] && HEALTH=$((HEALTH - 10))
[ "$FILES_IN_ROOT" -gt 0 ] && HEALTH=$((HEALTH - 10))
[ $HEALTH -lt 0 ] && HEALTH=0

echo "System Health: $HEALTH%"
echo ""

# Recommendations
echo "Recommendations:"
if [ "$STALE_TODOS" -gt 0 ]; then
    echo "  → Review stale TODOs (no updates in 30+ days)"
fi
if [ "$INVALID_TODOS" -gt 0 ]; then
    echo "  → Run: ./scripts/cleanup-todos.sh --confirm"
fi
if [ "$DUPLICATES" -gt 0 ]; then
    echo "  → Clean up duplicate TODO files"
fi
if [ "$FILES_IN_ROOT" -gt 0 ]; then
    echo "  → Organize TODOs into subdirectories (bug-fixes/, features/, etc.)"
fi
if [ $HEALTH -lt 80 ]; then
    echo "  → Schedule TODO system maintenance"
fi

echo ""
echo "✓ Audit complete"

exit 0
