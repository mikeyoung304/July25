#!/bin/bash

# cleanup-worktrees.sh
# Purpose: Remove worktrees with merged branches and clean up stale references
# Usage: ./scripts/cleanup-worktrees.sh

set -e

MAIN_REPO=$(cd "$(dirname "$0")/../" && pwd)
WORKTREE_DIR=".worktrees"

echo "=== Worktree Cleanup Script ==="
echo ""

# Change to main repo
cd "$MAIN_REPO"

# Track stats
CLEANED=0
MERGED=0
BROKEN=0

# Repair broken worktree references first
echo "Step 1: Repairing broken worktree references..."
if git worktree repair 2>/dev/null; then
    echo "  ✓ Worktree references repaired"
else
    echo "  (No repairs needed)"
fi

echo ""
echo "Step 2: Finding merged worktrees..."

# Find and remove worktrees with merged branches
while IFS= read -r line; do
    # Parse worktree line: path (branch) hash (detached)
    path=$(echo "$line" | awk '{print $1}')
    branch_info=$(echo "$line" | grep -oP '\(\K[^)]+')

    # Skip main repo path
    if [ "$path" = "$(pwd)" ]; then
        continue
    fi

    # Check if branch exists and is merged
    if [ -d "$path/.git" ] || [ -f "$path/.git" ]; then
        WORKTREE_NAME=$(basename "$path")

        # Check if merged to main
        if (cd "$path" && git merge-base --is-ancestor HEAD origin/main 2>/dev/null); then
            echo "  Removing merged worktree: $WORKTREE_NAME"
            git worktree remove "$path" 2>/dev/null && {
                MERGED=$((MERGED + 1))
            }
        fi
    fi
done < <(git worktree list | tail -n +2)

echo ""
echo "Step 3: Removing broken worktrees..."

# Remove broken worktrees (no .git dir)
if [ -d "$WORKTREE_DIR" ]; then
    for worktree in "$WORKTREE_DIR"/*; do
        if [ -d "$worktree" ]; then
            if [ ! -f "$worktree/.git" ] && [ ! -d "$worktree/.git" ]; then
                WORKTREE_NAME=$(basename "$worktree")
                echo "  Removing broken worktree: $WORKTREE_NAME"
                git worktree remove "$worktree" --force 2>/dev/null && {
                    BROKEN=$((BROKEN + 1))
                } || rm -rf "$worktree"
            fi
        fi
    done
fi

echo ""
echo "Step 4: Pruning stale references..."
git worktree prune
git gc --aggressive

echo ""
echo "=== Cleanup Summary ==="
echo "  Merged worktrees removed: $MERGED"
echo "  Broken worktrees removed: $BROKEN"
echo ""

# List remaining worktrees
REMAINING=$(git worktree list | tail -n +2 | wc -l)
echo "Remaining active worktrees: $REMAINING"
if [ "$REMAINING" -gt 0 ]; then
    echo ""
    echo "Active worktrees:"
    git worktree list | tail -n +2 | while IFS= read -r line; do
        path=$(echo "$line" | awk '{print $1}')
        if [ "$path" != "$(pwd)" ]; then
            echo "  - $(basename "$path")"
        fi
    done
fi

echo ""
echo "✓ Worktree cleanup complete"
