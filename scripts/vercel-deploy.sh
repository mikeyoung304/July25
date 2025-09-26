#!/bin/bash
set -e

# Vercel Safe Deployment Script
# This is the ONLY way to deploy to Vercel

echo "🔍 Running Vercel deployment checks..."

# 1. Check we're in project root
if [ ! -f "vercel.json" ]; then
  echo "❌ ERROR: Not in project root directory!"
  echo "   Please cd to the repository root and try again."
  exit 1
fi

# 2. Check for rogue .vercel directories in subdirectories
ROGUE_VERCELS=$(find . -name ".vercel" -type d | grep -v "^\.\/.vercel$" | head -5)
if [ ! -z "$ROGUE_VERCELS" ]; then
  echo "❌ ERROR: Found .vercel directories in subdirectories:"
  echo "$ROGUE_VERCELS"
  echo ""
  echo "These will cause duplicate Vercel projects!"
  echo "Run: rm -rf client/.vercel server/.vercel shared/.vercel"
  exit 1
fi

# 3. Check if Vercel is linked
if [ ! -f ".vercel/project.json" ]; then
  echo "⚠️  No Vercel project linked. Linking to july25-client..."
  vercel link --project july25-client --yes
fi

# 4. Verify correct project is linked
PROJECT_NAME=$(node -p "require('./.vercel/project.json').projectName" 2>/dev/null || echo "")
if [ "$PROJECT_NAME" != "july25-client" ]; then
  echo "❌ ERROR: Wrong project linked: $PROJECT_NAME"
  echo "   Fixing link to july25-client..."
  rm -rf .vercel
  vercel link --project july25-client --yes
fi

# 5. Show deployment info
echo "✅ All checks passed!"
echo ""
echo "📦 Project: july25-client"
echo "🌍 Target: Production"
echo "🔗 URL: https://july25-client.vercel.app"
echo ""

# 6. Ask for confirmation
read -p "Deploy to production? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Deployment cancelled"
  exit 1
fi

# 7. Deploy with proper environment
echo "🚀 Deploying to Vercel..."
export ROLLUP_NO_NATIVE=1
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: https://july25-client.vercel.app"