#!/bin/bash
set -euo pipefail
echo "=== CLIENT BUILD REPRO ==="
echo "Current Node: $(node -v)"
echo "Expected: 20.x (per package.json)"
echo ""

# Go to root (simulating Vercel)
cd "$(git rev-parse --show-toplevel)"

echo "Step 1: Clean install with workspaces (Vercel command)"
rm -rf node_modules client/node_modules server/node_modules shared/node_modules
npm ci --workspaces

echo ""
echo "Step 2: Build shared first (required by vercel.json)"
npm run build --workspace shared

echo ""
echo "Step 3: Build client"
npm run build --workspace client

echo ""
echo "=== BUILD COMPLETE ==="