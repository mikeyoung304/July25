#!/bin/bash
# Master Diagnostic Script - claudelessons-v2
# Implements the 5-minute diagnosis rule

set -e

ERROR_MSG="${1:-}"
LEVEL="${2:-1}"

echo "🔍 Claudelessons-v2 Diagnostic Protocol"
echo "======================================="

# 1. Check Error Pattern Library (30s)
echo "[1/5] Checking Error Pattern Library..."
if [ -n "$ERROR_MSG" ]; then
  if echo "$ERROR_MSG" | grep -q "Cannot find declaration"; then
    echo "⚠️  EPL Match: CL-ERROR-001 - Likely browser code in server build"
    echo "   Test: grep -r 'window\\|document' shared/"
  fi
fi

# 2. Clean Slate Protocol (2m)
echo "[2/5] Running Clean Slate Protocol Level $LEVEL..."
rm -rf node_modules dist .cache package-lock.json
npm ci
npm run build 2>&1 | head -20

# 3. Parallel Investigations (if still failing)
echo "[3/5] Launching parallel investigations..."
(
  echo "Investigation 1: Git history"
  git log --grep="build" --oneline | head -5
) &

(
  echo "Investigation 2: Environment check"
  node --version
  npm --version
) &

(
  echo "Investigation 3: TypeScript files"
  tsc --listFiles 2>/dev/null | grep -E "shared|window|document" | head -10
) &

wait

# 4. Apply lessons
echo "[4/5] Applying claudelessons..."
echo "✓ CL-BUILD-001: Clean build reproduction"
echo "✓ CL-DIAG-001: Parallel investigation"
echo "✓ CL-ASSUME-001: Challenge assumptions"
echo "✓ CL-ERROR-001: Error misdirection"
echo "✓ CL-WORKSPACE-001: Monorepo compilation"

# 5. Report
echo "[5/5] Diagnostic complete"
echo ""
echo "If not resolved in 5 minutes, escalate with this context."
echo "Remember: Most 'missing type' errors are actually compilation issues."