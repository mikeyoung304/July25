#!/bin/bash
#
# Fix Vercel Environment Variables - Remove Embedded Newlines
# Created: 2025-11-06
# Issue: Multiple env vars have literal \n characters
#

set -e

echo "========================================================================"
echo "Fixing Vercel Environment Variables - Removing Embedded Newlines"
echo "========================================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to set environment variable without newline
set_env() {
    local name=$1
    local value=$2
    local env=$3
    
    echo -e "${YELLOW}Setting $name in $env environment...${NC}"
    
    # Remove old value (ignore errors if it doesn't exist)
    vercel env rm "$name" "$env" --yes 2>/dev/null || true
    
    # Add new value without newline
    echo -n "$value" | vercel env add "$name" "$env"
    
    echo -e "${GREEN}✓ $name set to: $value${NC}"
    echo ""
}

echo "This script will fix the following issues:"
echo "1. VITE_DEFAULT_RESTAURANT_ID with embedded \\n"
echo "2. STRICT_AUTH with embedded \\n"
echo "3. VITE_DEMO_PANEL with embedded \\n"
echo "4. VITE_FEATURE_NEW_CUSTOMER_ID_FLOW with embedded \\n"
echo ""
echo "It will also add VITE_DEFAULT_RESTAURANT_ID to Preview and Development"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo ""
echo "========================================================================"
echo "PRODUCTION ENVIRONMENT"
echo "========================================================================"
echo ""

set_env "VITE_DEFAULT_RESTAURANT_ID" "grow" "production"
set_env "STRICT_AUTH" "true" "production"
set_env "VITE_DEMO_PANEL" "1" "production"
set_env "VITE_FEATURE_NEW_CUSTOMER_ID_FLOW" "false" "production"

echo ""
echo "========================================================================"
echo "PREVIEW ENVIRONMENT"
echo "========================================================================"
echo ""

set_env "VITE_DEFAULT_RESTAURANT_ID" "grow" "preview"
set_env "STRICT_AUTH" "true" "preview"
set_env "VITE_FEATURE_NEW_CUSTOMER_ID_FLOW" "false" "preview"

echo ""
echo "========================================================================"
echo "DEVELOPMENT ENVIRONMENT"
echo "========================================================================"
echo ""

set_env "VITE_DEFAULT_RESTAURANT_ID" "grow" "development"
set_env "STRICT_AUTH" "true" "development"
set_env "VITE_FEATURE_NEW_CUSTOMER_ID_FLOW" "false" "development"

echo ""
echo "========================================================================"
echo "VERIFICATION"
echo "========================================================================"
echo ""

echo "Pulling environment variables to verify..."
vercel env pull .env.verify.production --environment production
vercel env pull .env.verify.preview --environment preview
vercel env pull .env.verify.development --environment development

echo ""
echo "Checking for embedded newlines..."
echo ""

check_newlines() {
    local file=$1
    local env_name=$2
    
    echo "Checking $env_name:"
    if grep -q '\\n"' "$file"; then
        echo -e "${RED}  ⚠️  Still has newlines in:${NC}"
        grep '\\n"' "$file" | sed 's/^/    /'
    else
        echo -e "${GREEN}  ✓ No embedded newlines found${NC}"
    fi
    echo ""
}

check_newlines ".env.verify.production" "Production"
check_newlines ".env.verify.preview" "Preview"
check_newlines ".env.verify.development" "Development"

echo "========================================================================"
echo "NEXT STEPS"
echo "========================================================================"
echo ""
echo "1. Review the verification output above"
echo "2. If no newlines found, trigger a new deployment:"
echo "   vercel --prod"
echo ""
echo "3. After deployment, test the application:"
echo "   - Visit https://your-domain/grow/order"
echo "   - Check that routing works correctly"
echo "   - Verify API calls succeed"
echo ""
echo "4. Clean up temporary files:"
echo "   rm .env.verify.*"
echo ""
echo "Done!"
echo ""
