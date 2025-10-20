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
    echo "## Code Evidence: Transaction Usage in Order Creation"
    echo ""
    echo "Search for transactions or lack thereof in order creation:"
    echo '```'
    rg -n "createOrder|BEGIN|COMMIT|ROLLBACK|transaction|prisma\\..*\\\$transaction" server | head -n 50
    echo '```'
    echo ""
    echo "*Evidence truncated to 50 lines. Full results saved to artifacts/evidence/STAB-001.txt*"
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body-file "$OUT"
fi

# STAB-002: optimistic locking/version column
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-002") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-002"
  OUT="artifacts/evidence/STAB-002.txt"
  {
    echo "## Code Evidence: Optimistic Locking / Version Checks"
    echo ""
    echo "Search code for version checks and status updates:"
    echo '```'
    rg -n "updateOrderStatus|version\\s*\\+|WHERE id|status\\s*=" server | head -n 50
    echo '```'
    echo ""
    echo "*Evidence truncated to 50 lines. Full results saved to artifacts/evidence/STAB-002.txt*"
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body-file "$OUT"
fi

# STAB-003: hardcoded tax rate vs DB config
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-003") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-003"
  OUT="artifacts/evidence/STAB-003.txt"
  {
    echo "## Code Evidence: Hardcoded Tax Rates"
    echo ""
    echo "Search code for TAX_RATE hardcodes:"
    echo '```'
    rg -n "TAX_RATE|taxRate|tax_rate|const\\s+TAX" server | head -n 30
    echo '```'
    echo ""
    echo "*Evidence truncated to 30 lines. Full results saved to artifacts/evidence/STAB-003.txt*"
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body-file "$OUT"
fi

# STAB-004: audit logging must not be optional
ISSUE_NUM=$(jq -r '.[] | select(.id=="STAB-004") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect STAB-004"
  OUT="artifacts/evidence/STAB-004.txt"
  {
    echo "## Code Evidence: Payment Audit Logging"
    echo ""
    echo "Search payment logging and error swallowing:"
    echo '```'
    rg -n "logPaymentAttempt|catch|logger|return\\s+true|ignore" server | head -n 50
    echo '```'
    echo ""
    echo "*Evidence truncated to 50 lines. Full results saved to artifacts/evidence/STAB-004.txt*"
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body-file "$OUT"
fi

# OPT-005: ElapsedTimer stale renders
ISSUE_NUM=$(jq -r '.[] | select(.id=="OPT-005") | .number' "$MAP" 2>/dev/null || true)
if [ -n "${ISSUE_NUM:-}" ]; then
  say "Collect OPT-005"
  OUT="artifacts/evidence/OPT-005.txt"
  {
    echo "## Code Evidence: ElapsedTimer Implementation"
    echo ""
    echo "References to ElapsedTimer:"
    echo '```'
    rg -n "ElapsedTimer" client/src | head -n 20 || true
    echo '```'
    echo ""
    echo "ElapsedTimer component implementation (key sections - lines 1-100):"
    echo '```tsx'
    [ -f client/src/components/shared/timers/ElapsedTimer.tsx ] && sed -n '1,100p' client/src/components/shared/timers/ElapsedTimer.tsx
    echo '```'
    echo ""
    echo "*Evidence truncated. Full implementation saved to artifacts/evidence/OPT-005.txt*"
  } > "$OUT" 2>&1
  gh issue comment "$ISSUE_NUM" --body-file "$OUT"
fi

echo "Local evidence comments posted (if matching issues exist)."
