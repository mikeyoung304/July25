#!/bin/bash

# BuildPanel Security Check Script
# This script prevents AI services from being used directly in client-side code

echo "🔒 Checking BuildPanel security boundary..."

# Check for direct BuildPanel calls in client code
BUILDPANEL_CALLS=$(grep -r "localhost:3003\|buildpanel" client/src/ 2>/dev/null || true)
if [ ! -z "$BUILDPANEL_CALLS" ]; then
    echo "❌ ERROR: Direct BuildPanel access found in client code!"
    echo "$BUILDPANEL_CALLS"
    echo ""
    echo "BuildPanel must ONLY be accessed through backend proxy. See docs/SECURITY_BUILDPANEL.md"
    exit 1
fi

# Check for AI SDK imports in client code (OpenAI, BuildPanel clients, etc.)
AI_IMPORTS=$(grep -r "from ['\"]openai['\"]" client/src/ 2>/dev/null || true)
AI_IMPORTS="$AI_IMPORTS$(grep -r "from ['\"]@buildpanel" client/src/ 2>/dev/null || true)"
if [ ! -z "$AI_IMPORTS" ]; then
    echo "❌ ERROR: AI SDK imports found in client code!"
    echo "$AI_IMPORTS"
    echo ""
    echo "AI SDKs must ONLY be used server-side. See docs/SECURITY_BUILDPANEL.md"
    exit 1
fi

# Check for VITE_BUILDPANEL or AI keys in env files
VITE_AI_KEYS=$(grep -r "VITE_BUILDPANEL\|VITE_OPENAI" . --include="*.env*" --include="env.ts" 2>/dev/null || true)
if [ ! -z "$VITE_AI_KEYS" ]; then
    echo "❌ ERROR: AI service configuration found in client environment!"
    echo "$VITE_AI_KEYS"
    echo ""
    echo "AI service configuration must NEVER be exposed to the browser. Use backend-only environment variables."
    exit 1
fi

# Check for AI packages in client package.json
if [ -f "client/package.json" ]; then
    AI_PACKAGES=$(grep -E '"openai":\s*"|"@buildpanel' client/package.json || true)
    if [ ! -z "$AI_PACKAGES" ]; then
        echo "❌ ERROR: AI packages found in client dependencies!"
        echo "$AI_PACKAGES"
        echo ""
        echo "Remove AI packages from client/package.json. They should only be in server/package.json"
        exit 1
    fi
fi

# Verify USE_BUILDPANEL is properly configured
if [ -f ".env" ]; then
    BUILDPANEL_CONFIG=$(grep "USE_BUILDPANEL=true" .env || true)
    if [ -z "$BUILDPANEL_CONFIG" ]; then
        echo "⚠️  WARNING: USE_BUILDPANEL=true not found in .env"
        echo "AI features will not work without BuildPanel integration enabled."
    fi
fi

echo "✅ BuildPanel security check passed!"
exit 0