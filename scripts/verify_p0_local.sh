#!/usr/bin/env bash
set -euo pipefail

MAP="docs/audits/verification-map-P0.json"
[ -f "$MAP" ] || { echo "Missing $MAP"; exit 1; }

say() { printf "\n== %s ==\n" "$*"; }

# STAB-001: transactions in createOrder
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-001") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-001"
  OUT="artifacts/evidence/STAB-001.txt"
  {
    echo "Search for transactions or lack thereof in order creation"
    rg -n "createOrder|BEGIN|COMMIT|ROLLBACK|transaction|prisma\\..*\\\$transaction" server | head -n 120
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body "Uploading initial code evidence (transactions search). See attached block:" --body-file "$OUT"
fi

# STAB-002: optimistic locking/version column
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-002") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-002"
  OUT="artifacts/evidence/STAB-002.txt"
  {
    echo "Search code for version checks and status updates"
    rg -n "updateOrderStatus|version\\s*\\+|WHERE id|status\\s*=" server | head -n 200
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body "Initial code scan for optimistic locking/version usage:" --body-file "$OUT"
fi

# STAB-003: hardcoded tax rate vs DB config
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-003") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-003"
  OUT="artifacts/evidence/STAB-003.txt"
  {
    echo "Search code for TAX_RATE hardcodes"
    rg -n "TAX_RATE|taxRate|tax_rate|const\\s+TAX" server | head -n 200
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body "Code scan for tax-rate hardcodes:" --body-file "$OUT"
fi

# STAB-004: audit logging must not be optional
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-004") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-004"
  OUT="artifacts/evidence/STAB-004.txt"
  {
    echo "Search payment logging and error swallowing"
    rg -n "logPaymentAttempt|catch|logger|return\\s+true|ignore" server | head -n 200
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body "Payment audit-logging scan:" --body-file "$OUT"
fi

# OPT-005: ElapsedTimer stale renders
ISSUE_NUM=$(jq -r '.[] | select(.id=="OPT-005") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect OPT-005"
  OUT="artifacts/evidence/OPT-005.txt"
  {
    rg -n "ElapsedTimer" client/src || true
    [ -f client/src/components/shared/timers/ElapsedTimer.tsx ] && sed -n '1,240p' client/src/components/shared/timers/ElapsedTimer.tsx
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body "ElapsedTimer current implementation for review:" --body-file "$OUT"
fi

echo "Local evidence comments posted (if matching issues exist)."
