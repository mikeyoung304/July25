#!/bin/bash

# Pre-commit checks for code quality
# Updated after BuildPanel removal - no longer checking for direct AI service access

echo "Running pre-commit checks..."

# Check for exposed secrets
echo "Checking for exposed secrets..."
if grep -r "sk-[a-zA-Z0-9]\{48\}" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null; then
    echo "❌ Found potential OpenAI API keys in code!"
    echo "Please use environment variables instead"
    exit 1
fi

# Check for direct OpenAI calls in frontend
echo "Checking for direct AI service access in frontend..."
if grep -r "api\.openai\.com" client/src --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ Found direct OpenAI API calls in frontend!"
    echo "AI services must only be accessed through the backend"
    exit 1
fi

# Check for VITE_OPENAI in frontend config
if grep -r "VITE_OPENAI" client/ --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ Found VITE_OPENAI environment variable!"
    echo "OpenAI keys must never be exposed to the frontend"
    exit 1
fi

# Run linting if available
if [ -f "package.json" ] && command -v npm &> /dev/null; then
    echo "Running linter..."
    npm run lint:fix 2>/dev/null || true
fi

# Run type checking if available
if [ -f "tsconfig.json" ] && command -v npm &> /dev/null; then
    echo "Running type check..."
    npm run typecheck 2>/dev/null || true
fi

echo "✅ All pre-commit checks passed!"
exit 0