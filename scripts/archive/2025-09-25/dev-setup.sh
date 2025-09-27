#!/bin/bash

# Development Setup Script
# Ensures consistent development environment setup

set -euo pipefail

echo "🚀 Setting up development environment..."

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Install workspace dependencies
for workspace in client server shared; do
    if [ -d "$workspace" ] && [ ! -d "$workspace/node_modules" ]; then
        echo "📦 Installing $workspace dependencies..."
        cd "$workspace"
        npm install
        cd ..
    fi
done

# Setup git hooks
if [ ! -f ".husky/pre-commit" ]; then
    echo "🪝 Setting up git hooks..."
    npm run prepare
fi

# Create test results directory
mkdir -p test-results/{enhanced-html-report,lighthouse,visual-regression}

# Setup environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env 2>/dev/null || echo "# Add your environment variables here" > .env
fi

# Verify database connection
echo "🔍 Checking database connectivity..."
npm run db:status || echo "⚠️  Database check failed - make sure your DATABASE_URL is configured"

# Run initial health checks
echo "🏥 Running health checks..."
npm run check:integration || echo "⚠️  Integration check failed - some services may be unavailable"

# Generate initial analysis
echo "📊 Generating codebase analysis..."
npm run analyze

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "  npm run dev          # Start development servers"
echo "  npm test             # Run test suite"
echo "  npm run lint:fix     # Fix code style issues"
echo "  npm run typecheck    # Check TypeScript types"