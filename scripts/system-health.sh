#!/bin/bash

# system-health.sh
# Purpose: Quick health check for worktree and TODO system
# Usage: ./scripts/system-health.sh

set -e

MAIN_REPO=$(cd "$(dirname "$0")/../" && pwd)

echo "=== System Health Check ==="
echo "Timestamp: $(date)"
echo ""

cd "$MAIN_REPO"

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

HEALTH_SCORE=100
ISSUES=0

# ===== WORKTREE CHECKS =====
echo "Worktree System"
echo "==============="

# Check worktree count
ACTIVE_WORKTREES=$(git worktree list | tail -n +2 | wc -l)
echo "  Active worktrees: $ACTIVE_WORKTREES"

if [ "$ACTIVE_WORKTREES" -gt 5 ]; then
    echo -e "    ${RED}✗${NC} Too many active worktrees (>5)"
    HEALTH_SCORE=$((HEALTH_SCORE - 15))
    ISSUES=$((ISSUES + 1))
elif [ "$ACTIVE_WORKTREES" -gt 0 ]; then
    echo -e "    ${YELLOW}⚠${NC} $ACTIVE_WORKTREES worktrees in use"
else
    echo -e "    ${GREEN}✓${NC} No worktrees (clean state)"
fi

# Check for broken worktrees
BROKEN_WORKTREES=0
while IFS= read -r line; do
    path=$(echo "$line" | awk '{print $1}')
    if [ -n "$path" ] && ! [ -d "$path" ]; then
        BROKEN_WORKTREES=$((BROKEN_WORKTREES + 1))
    fi
done < <(git worktree list | tail -n +2)

if [ "$BROKEN_WORKTREES" -gt 0 ]; then
    echo -e "    ${RED}✗${NC} Found $BROKEN_WORKTREES broken worktree references"
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
    ISSUES=$((ISSUES + 1))
fi

# Check .worktrees directory
if [ -d ".worktrees" ]; then
    WORKTREE_FILES=$(find .worktrees -type f -name "*.md" 2>/dev/null | wc -l)
    if [ "$WORKTREE_FILES" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠${NC} Found tracked files in .worktrees/ (should be gitignored)"
        HEALTH_SCORE=$((HEALTH_SCORE - 10))
        ISSUES=$((ISSUES + 1))
    fi
fi

echo ""
echo "TODO System"
echo "==========="

# Check TODO counts
TODO_DIR=".claude/todos"
if [ -d "$TODO_DIR" ]; then
    PENDING=$(find "$TODO_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
    echo "  Pending TODOs: $PENDING"

    if [ "$PENDING" -gt 20 ]; then
        echo -e "    ${YELLOW}⚠${NC} Large TODO backlog ($PENDING items)"
        HEALTH_SCORE=$((HEALTH_SCORE - 10))
        ISSUES=$((ISSUES + 1))
    fi

    # Check for completed TODOs in pending directory
    COMPLETED_IN_PENDING=$(find "$TODO_DIR" -name "*.md" -exec grep -l "status: completed" {} \; 2>/dev/null | wc -l)
    if [ "$COMPLETED_IN_PENDING" -gt 0 ]; then
        echo -e "    ${RED}✗${NC} Found $COMPLETED_IN_PENDING completed TODOs in pending directory"
        HEALTH_SCORE=$((HEALTH_SCORE - 15))
        ISSUES=$((ISSUES + 1))
    fi

    # Check for TODOs without status
    INVALID=$(find "$TODO_DIR" -name "*.md" -type f ! -exec grep -q "^status:" {} \; -print 2>/dev/null | wc -l)
    if [ "$INVALID" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠${NC} Found $INVALID TODOs without status field"
        HEALTH_SCORE=$((HEALTH_SCORE - 5))
        ISSUES=$((ISSUES + 1))
    fi

    # Check for stale TODOs
    STALE=$(find "$TODO_DIR" -name "*.md" -type f -mtime +30 2>/dev/null | wc -l)
    if [ "$STALE" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠${NC} Found $STALE stale TODOs (>30 days old)"
        HEALTH_SCORE=$((HEALTH_SCORE - 5))
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "    ${YELLOW}⚠${NC} TODO directory not found"
fi

# Check solutions archive
SOLUTION_DIR=".claude/solutions"
if [ -d "$SOLUTION_DIR" ]; then
    SOLUTIONS=$(find "$SOLUTION_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
    echo "  Archived solutions: $SOLUTIONS"
else
    echo -e "    ${YELLOW}⚠${NC} Solutions directory not found (not critical)"
fi

echo ""
echo "Git Configuration"
echo "================="

# Check .gitignore for worktree exclusions
if grep -q "\.worktrees" .gitignore 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} .worktrees properly gitignored"
else
    echo -e "  ${YELLOW}⚠${NC} .worktrees not in .gitignore"
    HEALTH_SCORE=$((HEALTH_SCORE - 5))
    ISSUES=$((ISSUES + 1))
fi

# Check for uncommitted changes
UNCOMMITTED=$(git status --short 2>/dev/null | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo "  Uncommitted changes: $UNCOMMITTED files"
else
    echo -e "  ${GREEN}✓${NC} Working directory clean"
fi

echo ""
echo "Test Configuration"
echo "=================="

# Check Jest config
if [ -f "jest.config.js" ]; then
    if grep -q "\.worktrees" jest.config.js; then
        echo -e "  ${GREEN}✓${NC} Jest excludes .worktrees"
    else
        echo -e "  ${YELLOW}⚠${NC} Jest may not exclude .worktrees"
        HEALTH_SCORE=$((HEALTH_SCORE - 5))
        ISSUES=$((ISSUES + 1))
    fi
fi

# Check for test artifacts
TEST_ARTIFACTS=$(find . -path "./.worktrees/*/coverage" -o -path "./.worktrees/*/test-results" 2>/dev/null | wc -l)
if [ "$TEST_ARTIFACTS" -gt 0 ]; then
    echo -e "  ${YELLOW}⚠${NC} Found test artifacts in worktrees"
    HEALTH_SCORE=$((HEALTH_SCORE - 5))
fi

echo ""
echo "=================================="
echo "Health Score: $HEALTH_SCORE/100"
echo "Issues Found: $ISSUES"
echo "=================================="
echo ""

# Recommendations
if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✓ System is healthy${NC}"
else
    echo "Recommended Actions:"

    if [ "$ACTIVE_WORKTREES" -gt 5 ]; then
        echo "  → Clean up old worktrees: ./scripts/cleanup-worktrees.sh"
    fi

    if [ "$COMPLETED_IN_PENDING" -gt 0 ]; then
        echo "  → Archive completed TODOs: ./scripts/cleanup-todos.sh --confirm"
    fi

    if [ "$STALE" -gt 0 ]; then
        echo "  → Review stale TODOs: ./scripts/todo-audit.sh"
    fi

    if [ "$HEALTH_SCORE" -lt 70 ]; then
        echo "  → Run full system audit and maintenance"
    fi
fi

echo ""
echo "Full reports:"
echo "  - TODO Audit: ./scripts/todo-audit.sh"
echo "  - Worktree Status: git worktree list"
echo ""

# Exit with error code if health is poor
if [ "$HEALTH_SCORE" -lt 70 ]; then
    exit 1
else
    exit 0
fi
