#!/usr/bin/env bash
set -euo pipefail

echo "Node: $(node -v)"; echo "NPM: $(npm -v)"

if command -v markdownlint >/dev/null 2>&1; then
  markdownlint "**/*.md" || true
fi

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck "$0" || true
fi

# App checks (uncomment when enabled):
# npm run typecheck --workspaces
# npm run lint --workspaces --silent
# CI=1 RUN_VISUAL=0 RUN_PERF=0 RUN_E2E=0 npm run test:quick --workspaces
# npm run build --workspace client
# npm run build --workspace server

echo "[checks] docs checks complete."
