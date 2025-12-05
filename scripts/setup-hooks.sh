#!/bin/bash

# setup-hooks.sh
# Purpose: Configure git hooks for worktree and TODO system maintenance
# Usage: ./scripts/setup-hooks.sh

set -e

MAIN_REPO=$(cd "$(dirname "$0")/../" && pwd)

echo "=== Setting up Git Hooks ==="
echo ""

cd "$MAIN_REPO"

# Check if husky is installed
if ! command -v husky &> /dev/null; then
    echo "Installing husky..."
    npm install husky --save-dev
fi

# Initialize husky if not already done
if [ ! -d ".husky" ]; then
    echo "Initializing husky..."
    npx husky install
fi

echo ""
echo "Setting up pre-commit hook..."

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Running pre-commit checks..."
echo ""

ERRORS=0

# 1. Worktree health check
echo "1. Checking worktree integrity..."
if git worktree repair 2>/dev/null > /dev/null; then
    echo -e "   ${GREEN}✓${NC} Worktree references repaired"
else
    echo -e "   ${GREEN}✓${NC} Worktree references healthy"
fi

# 2. Check for .worktrees in commits
echo "2. Checking for .worktrees/ in commits..."
WORKTREE_STAGED=$(git diff --cached --name-only | grep "^\.worktrees/" | wc -l || true)
if [ "$WORKTREE_STAGED" -gt 0 ]; then
    echo -e "   ${RED}✗${NC} Cannot commit .worktrees/ files:"
    git diff --cached --name-only | grep "^\.worktrees/" || true
    ERRORS=$((ERRORS + 1))
else
    echo -e "   ${GREEN}✓${NC} No .worktrees/ files in commit"
fi

# 3. Check for claude directory artifacts
echo "3. Checking for .claude/ artifacts..."
CLAUDE_STAGED=$(git diff --cached --name-only | grep "^\.claude/notes/" | wc -l || true)
if [ "$CLAUDE_STAGED" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠${NC} Committing .claude/notes/ (temporary notes)"
else
    echo -e "   ${GREEN}✓${NC} .claude/ clean"
fi

# 4. Check for completed TODOs in pending directory
echo "4. Checking for completed TODOs in pending..."
TODO_FILES=$(git diff --cached --name-only .claude/todos || true)
if [ -n "$TODO_FILES" ]; then
    COMPLETED_STAGED=$(echo "$TODO_FILES" | xargs -I {} grep -l "status: completed" {} 2>/dev/null | wc -l || true)
    if [ "$COMPLETED_STAGED" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠${NC} Committing completed TODOs (should be archived):"
        echo "$TODO_FILES" | xargs -I {} grep -l "status: completed" {} 2>/dev/null || true
    else
        echo -e "   ${GREEN}✓${NC} No completed TODOs in pending"
    fi
else
    echo -e "   ${GREEN}✓${NC} No completed TODOs in pending"
fi

# 5. Check for test artifacts
echo "5. Checking for test artifacts..."
TEST_ARTIFACTS=$(git diff --cached --name-only | grep -E "(coverage|test-results|\.nyc_output)" | wc -l || true)
if [ "$TEST_ARTIFACTS" -gt 0 ]; then
    echo -e "   ${RED}✗${NC} Cannot commit test artifacts:"
    git diff --cached --name-only | grep -E "(coverage|test-results|\.nyc_output)" || true
    ERRORS=$((ERRORS + 1))
else
    echo -e "   ${GREEN}✓${NC} No test artifacts in commit"
fi

# 6. Check for node_modules
echo "6. Checking for node_modules..."
NODE_MODULES=$(git diff --cached --name-only | grep "node_modules/" | wc -l || true)
if [ "$NODE_MODULES" -gt 0 ]; then
    echo -e "   ${RED}✗${NC} Cannot commit node_modules"
    ERRORS=$((ERRORS + 1))
else
    echo -e "   ${GREEN}✓${NC} node_modules properly ignored"
fi

echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}✗ Pre-commit checks failed ($ERRORS errors)${NC}"
    echo ""
    echo "Fix the issues above and try again."
    echo ""
    echo "For help, see: .claude/prevention/WORKTREE-TODO-MAINTENANCE.md"
    exit 1
fi

echo -e "${GREEN}✓ All pre-commit checks passed${NC}"
echo ""

# Run quick tests if available
if [ -f "package.json" ]; then
    if grep -q '"test:quick"' package.json; then
        echo "Running quick tests..."
        npm run test:quick || {
            echo -e "${RED}✗ Quick tests failed${NC}"
            exit 1
        }
    fi
fi

echo -e "${GREEN}✓ Ready to commit${NC}"
EOF

chmod +x .husky/pre-commit

echo -e "  ${GREEN}✓${NC} Created pre-commit hook"

echo ""
echo "Setting up post-merge hook..."

# Create post-merge hook
cat > .husky/post-merge << 'EOF'
#!/bin/bash

# Auto-cleanup merged worktrees after merge
echo "Cleaning up merged worktrees..."

CLEANED=0
git worktree list | tail -n +2 | while IFS= read -r line; do
    path=$(echo "$line" | awk '{print $1}')
    if [ -n "$path" ] && [ "$path" != "$(pwd)" ]; then
        if [ -d "$path/.git" ] || [ -f "$path/.git" ]; then
            if (cd "$path" && git merge-base --is-ancestor HEAD origin/main 2>/dev/null); then
                WORKTREE_NAME=$(basename "$path")
                git worktree remove "$path" 2>/dev/null && {
                    echo "  ✓ Removed merged: $WORKTREE_NAME"
                    CLEANED=$((CLEANED + 1))
                }
            fi
        fi
    fi
done

if [ "$CLEANED" -gt 0 ]; then
    git worktree prune
    echo "Cleaned up $CLEANED merged worktrees"
fi
EOF

chmod +x .husky/post-merge

echo -e "  ${GREEN}✓${NC} Created post-merge hook"

echo ""
echo "=== Hook Installation Complete ==="
echo ""
echo "Installed hooks:"
echo "  ✓ pre-commit  - Validates worktrees, TODOs, and artifacts"
echo "  ✓ post-merge  - Auto-cleans merged worktrees"
echo ""
echo "These hooks will run automatically on git commands."
echo "To bypass (not recommended): git commit --no-verify"
echo ""
echo "Next steps:"
echo "  1. Make a test commit to verify hooks work"
echo "  2. Review .claude/prevention/WORKTREE-TODO-MAINTENANCE.md"
echo "  3. Run maintenance scripts: ./scripts/system-health.sh"
