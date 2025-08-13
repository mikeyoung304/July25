#!/usr/bin/env bash
set -euo pipefail

echo "Running CI guards..."

# 1) No legacy service references in active code  
echo -n "Checking for legacy service references... "
if grep -r "BuildPanel\|BUILDPANEL" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.sh" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v _archive | grep -v archive | grep -v dist | grep -v CHANGELOG | grep -v "ci-guards.sh" | grep -v POST_MERGE_TICKETS | grep -v "docs/_reports" | grep -v TROUBLESHOOTING >/dev/null; then
  echo "❌ Found legacy service references in active code."
  grep -r "BuildPanel\|BUILDPANEL" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.sh" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v _archive | grep -v archive | grep -v dist | grep -v CHANGELOG | grep -v POST_MERGE_TICKETS | grep -v "docs/_reports" | grep -v TROUBLESHOOTING | head -5
  exit 1
fi
echo "✅"

# 2) No 'sk-proj' or 'sk-' patterns that look like real keys
echo -n "Checking for API key patterns... "
if git grep -I "[REDACTED][a-zA-Z0-9]" -- . ':!**/_archive/**' ':!**/node_modules/**' ':!**/*.png' ':!**/*.jpg' ':!**/*.svg' >/dev/null 2>&1; then
  echo "❌ Found potential API key pattern in repo."
  git grep -I "[REDACTED]" -- . ':!**/_archive/**' ':!**/node_modules/**' ':!**/*.png' ':!**/*.jpg' ':!**/*.svg' | head -3
  exit 1
fi
echo "✅"

# 3) No client-side key refs
echo -n "Checking for OPENAI_API_KEY in client code... "
if [ -d client ]; then
  if grep -r "OPENAI_API_KEY" client/ 2>/dev/null | grep -v node_modules >/dev/null; then
    echo "❌ OPENAI_API_KEY referenced in client/"
    grep -r "OPENAI_API_KEY" client/ 2>/dev/null | grep -v node_modules | head -3
    exit 1
  fi
fi
echo "✅"

echo ""
echo "✅ All CI guards passed!"