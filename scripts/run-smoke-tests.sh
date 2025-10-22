#!/bin/bash
# Run E2E Smoke Tests
# Part of: Production Launch Preparation - Work Stream 1
#
# Purpose: Run critical path tests only (fast feedback)
# Usage: ./scripts/run-smoke-tests.sh
#
# Exit codes:
#   0 = All smoke tests passed
#   1 = One or more smoke tests failed

set -e

echo "🧪 Running E2E Smoke Tests..."
echo ""
echo "Critical paths being tested:"
echo "  ✓ Authentication (demo login)"
echo "  ✓ Server order flow (create → submit)"
echo "  ✓ Kitchen Display System (order display)"
echo ""

# Run Playwright smoke tests only
npx playwright test --project=smoke --reporter=list

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All smoke tests passed!"
  echo ""
  echo "Next steps:"
  echo "  • Run full E2E suite: npm run test:e2e"
  echo "  • Run load tests: ./scripts/run-load-tests.sh"
  echo "  • Deploy to production"
else
  echo "❌ Smoke tests failed!"
  echo ""
  echo "Action required:"
  echo "  • Review test output above"
  echo "  • Fix failing tests before deploying"
  echo "  • View HTML report: npx playwright show-report"
fi

exit $EXIT_CODE
