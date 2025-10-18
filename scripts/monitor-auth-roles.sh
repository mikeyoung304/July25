#!/bin/bash
#
# Auth Role Monitoring Script
# Analyzes server logs for authentication role usage patterns
#
# Purpose: Track adoption of 'customer' role vs deprecated 'kiosk_demo' role
# Related: PR #102, ADR-006 Dual Authentication Pattern
#
# Usage:
#   LOG_DIR=logs/ ./scripts/monitor-auth-roles.sh
#   LOG_DIR=/var/log/restaurant-os/ ./scripts/monitor-auth-roles.sh
#
# Environment Variables:
#   LOG_DIR - Directory containing log files (default: logs/)
#   LOG_PATTERN - Log file pattern to scan (default: *.log)
#   DAYS_BACK - How many days of logs to scan (default: 7)
#
# Output: Counts of customer tokens, server tokens, and deprecation warnings

set -e

# Configuration
LOG_DIR="${LOG_DIR:-logs/}"
LOG_PATTERN="${LOG_PATTERN:-*.log}"
DAYS_BACK="${DAYS_BACK:-7}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Auth Role Usage Monitor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Log Directory: $LOG_DIR"
echo "Pattern:       $LOG_PATTERN"
echo "Days Back:     $DAYS_BACK"
echo ""

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
  echo "⚠️  Log directory not found: $LOG_DIR"
  echo ""
  echo "Tips:"
  echo "  - Set LOG_DIR environment variable to your logs location"
  echo "  - Example: LOG_DIR=/var/log/restaurant-os/ $0"
  echo "  - Ensure log directory is readable"
  echo ""
  exit 1
fi

# Find log files (last N days)
LOG_FILES=$(find "$LOG_DIR" -name "$LOG_PATTERN" -type f -mtime -$DAYS_BACK 2>/dev/null || true)

if [ -z "$LOG_FILES" ]; then
  echo "⚠️  No log files found matching pattern: $LOG_PATTERN"
  echo ""
  echo "Checked: $LOG_DIR$LOG_PATTERN (last $DAYS_BACK days)"
  echo ""
  echo "Tips:"
  echo "  - Verify LOG_PATTERN matches your log file naming"
  echo "  - Check file permissions"
  echo "  - Adjust DAYS_BACK if logs are older"
  echo ""
  exit 1
fi

FILE_COUNT=$(echo "$LOG_FILES" | wc -l)
echo "✅ Found $FILE_COUNT log file(s) to analyze"
echo ""

# Count authentication events
# These patterns match the auth middleware logging in server/src/middleware/auth.ts

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Authentication Role Usage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count 'customer' role tokens
CUSTOMER_COUNT=$(grep -h '"role":"customer"' $LOG_FILES 2>/dev/null | wc -l || echo 0)
echo "Customer role tokens:       $CUSTOMER_COUNT"

# Count 'server' role tokens
SERVER_COUNT=$(grep -h '"role":"server"' $LOG_FILES 2>/dev/null | wc -l || echo 0)
echo "Server role tokens:         $SERVER_COUNT"

# Count 'kiosk_demo' role tokens
KIOSK_DEMO_COUNT=$(grep -h '"role":"kiosk_demo"' $LOG_FILES 2>/dev/null | wc -l || echo 0)
echo "Kiosk_demo role tokens:     $KIOSK_DEMO_COUNT (deprecated)"

# Count 'admin' and 'manager' roles
ADMIN_COUNT=$(grep -h '"role":"admin"' $LOG_FILES 2>/dev/null | wc -l || echo 0)
MANAGER_COUNT=$(grep -h '"role":"manager"' $LOG_FILES 2>/dev/null | wc -l || echo 0)
echo "Admin role tokens:          $ADMIN_COUNT"
echo "Manager role tokens:        $MANAGER_COUNT"

echo ""

# Count deprecation warnings
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Deprecation Warnings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Pattern: "kiosk_demo' is deprecated" (from auth.ts:75)
DEPRECATION_WARNINGS=$(grep -h "kiosk_demo.*deprecated" $LOG_FILES 2>/dev/null | wc -l || echo 0)
echo "kiosk_demo deprecation warnings:  $DEPRECATION_WARNINGS"

# Pattern: "kiosk_demo' rejected" (from auth.ts:81)
REJECTION_ERRORS=$(grep -h "kiosk_demo.*rejected" $LOG_FILES 2>/dev/null | wc -l || echo 0)
echo "kiosk_demo rejection errors:      $REJECTION_ERRORS"

echo ""

# Calculate totals
TOTAL_AUTH_EVENTS=$((CUSTOMER_COUNT + SERVER_COUNT + KIOSK_DEMO_COUNT + ADMIN_COUNT + MANAGER_COUNT))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total auth events:          $TOTAL_AUTH_EVENTS"

if [ $TOTAL_AUTH_EVENTS -gt 0 ]; then
  CUSTOMER_PCT=$((CUSTOMER_COUNT * 100 / TOTAL_AUTH_EVENTS))
  KIOSK_DEMO_PCT=$((KIOSK_DEMO_COUNT * 100 / TOTAL_AUTH_EVENTS))

  echo "Customer adoption:          ${CUSTOMER_PCT}%"
  echo "Kiosk_demo still in use:    ${KIOSK_DEMO_PCT}%"

  echo ""

  # Migration status assessment
  if [ $KIOSK_DEMO_COUNT -eq 0 ]; then
    echo "✅ MIGRATION COMPLETE: No kiosk_demo usage detected"
    echo "   → Safe to set AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false"
    echo "   → Safe to remove kiosk_demo scopes from DB"
  elif [ $KIOSK_DEMO_PCT -lt 5 ]; then
    echo "🟡 MIGRATION IN PROGRESS: <5% kiosk_demo usage"
    echo "   → Identify remaining kiosk_demo clients"
    echo "   → Plan final cutover date"
  elif [ $KIOSK_DEMO_PCT -lt 20 ]; then
    echo "🟠 MIGRATION EARLY STAGE: ${KIOSK_DEMO_PCT}% still using kiosk_demo"
    echo "   → Continue client migration efforts"
    echo "   → Monitor deprecation warnings"
  else
    echo "🔴 MIGRATION NOT STARTED: ${KIOSK_DEMO_PCT}% still using kiosk_demo"
    echo "   → Begin client migration to 'customer' role"
    echo "   → Review migration runbook: docs/runbooks/POST_DUAL_AUTH_ROLL_OUT.md"
  fi
fi

echo ""

# Recent deprecation warnings (last 10)
if [ $DEPRECATION_WARNINGS -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 Recent Deprecation Warnings (last 10)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  grep -h "kiosk_demo.*deprecated" $LOG_FILES 2>/dev/null | tail -10 || true

  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Analysis complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exit with status based on migration progress
if [ $REJECTION_ERRORS -gt 0 ]; then
  echo "⚠️  WARNING: kiosk_demo tokens are being rejected (AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false)"
  echo "   This may cause service disruption for unmigrated clients"
  echo ""
  exit 2
elif [ $KIOSK_DEMO_PCT -gt 50 ] && [ $TOTAL_AUTH_EVENTS -gt 0 ]; then
  echo "ℹ️  INFO: Majority of auth still using kiosk_demo - migration in early stages"
  echo ""
  exit 0
else
  exit 0
fi
