#!/bin/bash
# Deploy Preview Script for July25 Monorepo
# This script deploys a preview build to Vercel with proper environment setup

set -e  # Exit on error

echo "🚀 Starting preview deployment..."
echo "================================="

# Check if we're in the project root
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please run from project root."
    exit 1
fi

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo "❌ Error: Vercel project not linked. Run: vercel link --project rebuild-6.0 --yes"
    exit 1
fi

# Show current project info
echo "📦 Project: rebuild-6.0"
echo "📁 Team: mikeyoung304-gmailcoms-projects"
echo ""

# Set environment for Rollup
export ROLLUP_NO_NATIVE=1

# Build and deploy preview
echo "🔧 Building and deploying preview..."
echo "Using ROLLUP_NO_NATIVE=1 to avoid native module issues"
echo ""

# Deploy to preview (non-production)
echo "Running: ROLLUP_NO_NATIVE=1 vercel"
PREVIEW_OUTPUT=$(ROLLUP_NO_NATIVE=1 vercel 2>&1)
PREVIEW_URL=$(echo "$PREVIEW_OUTPUT" | grep -o 'https://[^ ]*' | head -1)

# Extract and display the preview URL
if [ -n "$PREVIEW_URL" ]; then
    echo ""
    echo "✅ Preview deployment successful!"
    echo "================================="
    echo "🌐 Preview URL: $PREVIEW_URL"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Test the preview deployment"
    echo "  2. Check console for any errors"
    echo "  3. Verify environment variables are loaded"
    echo ""
    echo "💡 To deploy to production (after CI passes):"
    echo "   vercel --prod"
else
    echo ""
    echo "⚠️  Deployment completed but couldn't extract URL"
    echo "Check the Vercel dashboard for deployment status"
fi

echo "================================="
echo "Deployment script completed"