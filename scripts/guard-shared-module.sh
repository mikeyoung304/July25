#!/bin/bash

# CI Guard: Ensure shared module exists for Vercel builds
# Exit with error if critical shared files are missing

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 Checking shared module structure..."

# Check if shared/index.ts exists
if [ ! -f "$REPO_ROOT/shared/index.ts" ]; then
    echo "❌ ERROR: shared/index.ts is missing!"
    echo "This file is required for client imports from @rebuild/shared"
    exit 1
fi

# Check if shared/runtime.ts exists
if [ ! -f "$REPO_ROOT/shared/runtime.ts" ]; then
    echo "❌ ERROR: shared/runtime.ts is missing!"
    echo "This file provides runtime helpers for the client"
    exit 1
fi

# Check if types directory exists
if [ ! -d "$REPO_ROOT/shared/types" ]; then
    echo "❌ ERROR: shared/types directory is missing!"
    exit 1
fi

# Verify critical type files
REQUIRED_TYPES=(
    "order.types.ts"
    "menu.types.ts"
    "customer.types.ts"
    "table.types.ts"
    "websocket.types.ts"
)

for type_file in "${REQUIRED_TYPES[@]}"; do
    if [ ! -f "$REPO_ROOT/shared/types/$type_file" ]; then
        echo "❌ ERROR: shared/types/$type_file is missing!"
        exit 1
    fi
done

# Check Vite config has the alias
if ! grep -q "@rebuild/shared" "$REPO_ROOT/client/vite.config.ts"; then
    echo "⚠️ WARNING: @rebuild/shared alias not found in client/vite.config.ts"
fi

# Check TypeScript config has the paths
if ! grep -q "@rebuild/shared" "$REPO_ROOT/client/tsconfig.app.json"; then
    echo "⚠️ WARNING: @rebuild/shared path not found in client/tsconfig.app.json"
fi

echo "✅ Shared module structure is valid"
echo "📦 Files checked:"
echo "  - shared/index.ts ✓"
echo "  - shared/runtime.ts ✓"
echo "  - shared/types/*.ts ✓"
echo ""
echo "🚀 Ready for Vercel deployment"

exit 0