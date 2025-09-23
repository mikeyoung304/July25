#!/bin/bash
set -euo pipefail
echo "=== SERVER BUILD REPRO ==="
echo "Current Node: $(node -v)"
echo "Expected: 20.x (per render.yaml)"
echo ""

# Go to root (simulating Render)
cd "$(git rev-parse --show-toplevel)"

echo "Step 1: Clean install with workspaces (Render command)"
rm -rf node_modules server/node_modules client/node_modules shared/node_modules
npm ci --workspaces

echo ""
echo "Step 2: Build server"
npm run build --workspace server

echo ""
echo "=== BUILD COMPLETE ==="