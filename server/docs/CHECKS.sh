#!/usr/bin/env bash
set -euo pipefail

echo "Running Quality Gates..."
echo "========================"

echo "1️⃣  TypeScript check..."
npm run typecheck --workspaces

echo "2️⃣  ESLint check..."
npm run lint --workspaces --silent

echo "3️⃣  Tests (quick)..."
CI=1 RUN_VISUAL=0 RUN_PERF=0 RUN_E2E=0 npm run test:quick --workspaces

echo "4️⃣  Client build..."
npm run build --workspace client

echo "5️⃣  Server build..."
npm run build --workspace server

echo "6️⃣  Bundle budget..."
node scripts/check-bundle-budget.mjs

echo ""
echo "✅ All gates passed!"
