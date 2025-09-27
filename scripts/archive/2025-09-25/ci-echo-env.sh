#!/bin/bash
# CI Environment Echo Script
# Provides visibility into CI environment for debugging

echo "========================================="
echo "CI ENVIRONMENT DIAGNOSTICS"
echo "========================================="
echo ""

# Node version
echo "📦 Node Version: $(node -v 2>/dev/null || echo 'Node not found')"
echo "📦 NPM Version: $(npm -v 2>/dev/null || echo 'NPM not found')"
echo ""

# Working directory
echo "📁 Current Directory: $(pwd)"
echo "📁 Directory Contents:"
ls -la | head -10
echo ""

# Git information
echo "🔀 Git Branch: ${GITHUB_REF:-'Not in GitHub Actions'}"
echo "🔀 Git SHA: ${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'Unknown')}"
echo "🔀 Git Actor: ${GITHUB_ACTOR:-'Local'}"
echo ""

# Workflow information
echo "🚀 Workflow: ${GITHUB_WORKFLOW:-'Local execution'}"
echo "🚀 Job: ${GITHUB_JOB:-'N/A'}"
echo "🚀 Run ID: ${GITHUB_RUN_ID:-'N/A'}"
echo "🚀 Run Number: ${GITHUB_RUN_NUMBER:-'N/A'}"
echo ""

# Environment checks
echo "🔍 Environment Checks:"
if [ -n "$BASE_URL" ]; then
  echo "  ✅ BASE_URL is set (masked)"
else
  echo "  ⚠️  BASE_URL is not set"
fi

if [ -n "$VERCEL_TOKEN" ]; then
  echo "  ✅ VERCEL_TOKEN is set (masked)"
else
  echo "  ⚠️  VERCEL_TOKEN is not set"
fi

if [ -n "$RENDER_API_BASE" ]; then
  echo "  ✅ RENDER_API_BASE is set: ${RENDER_API_BASE}"
else
  echo "  ℹ️  RENDER_API_BASE not set (will use default)"
fi
echo ""

# File system checks
echo "🗂️ File System Checks:"
if [ -f "vercel.json" ]; then
  echo "  ⚠️  Root vercel.json EXISTS (may override settings)"
else
  echo "  ✅ No root vercel.json found"
fi

if [ -f "client/vercel.json" ]; then
  echo "  ✅ client/vercel.json found"
else
  echo "  ⚠️  client/vercel.json NOT found"
fi

if [ -d "shared" ]; then
  echo "  ✅ shared/ directory exists"
else
  echo "  ❌ shared/ directory NOT found"
fi

if [ -f "shared/index.ts" ]; then
  echo "  ✅ shared/index.ts exists"
else
  echo "  ❌ shared/index.ts NOT found"
fi
echo ""

echo "========================================="
echo "END CI DIAGNOSTICS"
echo "========================================="