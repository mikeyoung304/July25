#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo "[checks] failed at line $LINENO"; exit 1' ERR

echo "Node: $(node -v || echo 'node not found')"
echo "NPM: $(npm -v || echo 'npm not found')"

# markdown & shell lint if available
if command -v markdownlint >/dev/null 2>&1; then markdownlint "**/*.md" || true; fi
if command -v shellcheck >/dev/null 2>&1; then shellcheck "$0" || true; fi

# No-archive link guard (best-effort)
echo "[checks] scanning for links to archived docs"
if command -v rg >/dev/null 2>&1; then
  OFFENDERS="$(rg -nI '\]\(docs/_archive/[^)]*\)' --glob '!docs/_archive/**' --glob '**/*.md' || true)"
  if [ -n "$OFFENDERS" ]; then
    echo "[checks] ERROR: live docs link to archived content:"
    echo "$OFFENDERS"
    exit 1
  fi
else
  echo "[checks] ripgrep not found; skipping archive link check"
fi

# App checks (uncomment when enabled):
# npm run typecheck --workspaces
# npm run lint --workspaces --silent
# CI=1 RUN_VISUAL=0 RUN_PERF=0 RUN_E2E=0 npm run test:quick --workspaces
# npm run build --workspace client
# npm run build --workspace server
echo "[checks] docs checks complete."
