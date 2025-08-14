#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://july25.onrender.com}"
ENDPOINT="$BASE/api/v1/ai/health"

for i in {1..18}; do # ~90s
  code=$(curl -s -o /tmp/h.json -w "%{http_code}" "$ENDPOINT" || true)
  if [ "$code" = "200" ] && jq -e '.ok == true' /tmp/h.json >/dev/null 2>&1; then
    echo "Health OK at $ENDPOINT"
    exit 0
  fi
  echo "Waiting for health ($i/18)..."
  sleep 5
done

echo "Backend health check FAILED at $ENDPOINT"
cat /tmp/h.json || true
exit 1