#!/bin/bash

# cleanup-todos.sh
# Purpose: Archive completed TODOs and clean up duplicates
# Usage: ./scripts/cleanup-todos.sh --confirm

set -e

MAIN_REPO=$(cd "$(dirname "$0")/../" && pwd)
TODO_DIR=".claude/todos"
SOLUTION_DIR=".claude/solutions"

echo "=== TODO Cleanup Script ==="
echo ""

# Safety check
if [ "$1" != "--confirm" ]; then
    echo "This script will:"
    echo "  1. Archive completed TODO files to .claude/solutions/"
    echo "  2. Remove completed TODOs from .claude/todos/"
    echo "  3. Clean up duplicate TODO files"
    echo ""
    echo "Run with --confirm flag to proceed:"
    echo "  ./scripts/cleanup-todos.sh --confirm"
    exit 0
fi

cd "$MAIN_REPO"

# Track stats
ARCHIVED=0
DUPLICATES=0
FAILED=0

echo "Step 1: Archiving completed TODOs..."

# Find completed TODOs and archive them
if [ -d "$TODO_DIR" ]; then
    find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
        if grep -q "status: completed" "$todo_file" 2>/dev/null; then
            BASENAME=$(basename "$todo_file")
            TODAY=$(date +%Y-%m-%d)
            ARCHIVE_DIR="$SOLUTION_DIR/$TODAY"

            # Create archive directory
            mkdir -p "$ARCHIVE_DIR"

            # Copy to archive
            cp "$todo_file" "$ARCHIVE_DIR/$BASENAME" && {
                echo "  ✓ Archived: $BASENAME"
                ARCHIVED=$((ARCHIVED + 1))
            } || {
                echo "  ✗ Failed to archive: $BASENAME"
                FAILED=$((FAILED + 1))
            }
        fi
    done
fi

echo ""
echo "Step 2: Removing archived TODOs..."

# Remove completed TODOs from pending
if [ -d "$TODO_DIR" ]; then
    find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
        if grep -q "status: completed" "$todo_file" 2>/dev/null; then
            rm "$todo_file" && {
                echo "  ✓ Removed: $(basename "$todo_file")"
            } || {
                echo "  ✗ Failed to remove: $(basename "$todo_file")"
                FAILED=$((FAILED + 1))
            }
        fi
    done
fi

echo ""
echo "Step 3: Checking for duplicates..."

# Check for duplicate TODO files
if [ -d "$TODO_DIR" ]; then
    DUPES=$(find "$TODO_DIR" -name "*.md" -type f | \
        awk -F/ '{print $NF}' | \
        sort | uniq -d | wc -l)

    if [ "$DUPES" -gt 0 ]; then
        echo "  WARNING: Found $DUPES potential duplicates"
        find "$TODO_DIR" -name "*.md" -type f | \
            awk -F/ '{print $NF}' | \
            sort | uniq -d | while read dup; do
                echo "    - $dup"
                find "$TODO_DIR" -name "$dup"
            done
    else
        echo "  ✓ No duplicate TODO files found"
    fi
fi

echo ""
echo "Step 4: Validating TODO status..."

# Check for TODOs without status field
INVALID=0
if [ -d "$TODO_DIR" ]; then
    find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
        if ! grep -q "^status:" "$todo_file" 2>/dev/null; then
            echo "  ⚠ Missing status field: $(basename "$todo_file")"
            INVALID=$((INVALID + 1))
        fi
    done
fi

echo ""
echo "=== Cleanup Summary ==="
echo "  TODOs archived: $ARCHIVED"
echo "  Invalid TODOs: $INVALID"
echo "  Failed operations: $FAILED"
echo ""

# Show updated counts
PENDING_COUNT=$(find "$TODO_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
SOLUTIONS_COUNT=$(find "$SOLUTION_DIR" -name "*.md" -type f 2>/dev/null | wc -l)

echo "Status:"
echo "  Active TODOs: $PENDING_COUNT"
echo "  Archived solutions: $SOLUTIONS_COUNT"
echo ""

# Commit changes if requested
if [ "$ARCHIVED" -gt 0 ] || [ "$DUPLICATES" -gt 0 ]; then
    echo "Step 5: Committing changes..."
    cd "$MAIN_REPO"

    # Stage changes
    git add "$TODO_DIR" "$SOLUTION_DIR" 2>/dev/null || true

    # Create commit message
    COMMIT_MSG="docs(todos): cleanup completed items ($ARCHIVED archived)"

    # Only commit if there are changes
    if ! git diff --cached --quiet; then
        git commit -m "$COMMIT_MSG" && {
            echo "  ✓ Changes committed"
        } || {
            echo "  ✗ Commit failed"
        }
    else
        echo "  (No changes to commit)"
    fi
fi

echo ""
echo "✓ TODO cleanup complete"

# Exit with error if there were failures
if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
