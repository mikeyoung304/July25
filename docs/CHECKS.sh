#!/usr/bin/env bash
set -euo pipefail

echo "Node: $(node -v)"; echo "NPM: $(npm -v)"

if command -v markdownlint >/dev/null 2>&1; then
  markdownlint "**/*.md" || true
fi

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck "$0" || true
fi

echo "[checks] scanning for links to archived docs"
if command -v rg >/dev/null 2>&1; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import pathlib
import re
import subprocess
import sys

pattern = r'\]\(docs/_archive/[^)]*\)'
cmd = [
    'rg',
    '-n',
    '--no-heading',
    pattern,
    '-g',
    '*.md',
    '--glob',
    '!docs/_archive/**'
]
try:
    raw = subprocess.check_output(cmd, text=True)
except subprocess.CalledProcessError as exc:
    if exc.returncode == 1:
        print('[checks] no archive links detected')
        sys.exit(0)
    raise

offenders = []
heading_re = re.compile(r'^\s*(#+)\s+(.+)$')
history_re = re.compile(r'^\s*(#+)\s+History\b', re.IGNORECASE)
for line in raw.strip().splitlines():
    if not line.strip():
        continue
    path_str, line_str, content = line.split(':', 2)
    path = pathlib.Path(path_str)
    if len(path.parts) >= 2 and path.parts[0] == 'docs' and path.parts[1] == '_archive':
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        text = path.read_text(encoding='utf-8', errors='ignore')
    lines = text.splitlines()
    idx = int(line_str) - 1
    last_heading_is_history = False
    for current in range(idx + 1):
        match = heading_re.match(lines[current])
        if match:
            last_heading_is_history = bool(history_re.match(lines[current]))
    if not last_heading_is_history:
        offenders.append(f"{path_str}:{line_str}:{content.strip()}")

if offenders:
    print('[checks] ERROR: live docs link to archived content:')
    for entry in offenders:
        print(entry)
    sys.exit(1)

print('[checks] no archive links detected')
PY
  else
    echo "[checks] python3 not found; skipping archive link check"
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
