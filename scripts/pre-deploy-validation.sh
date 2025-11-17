#!/bin/bash
#
# Pre-Deployment Validation Script
# Catches configuration issues before deploying to production
# Created: 2025-11-06
#
# Usage: ./scripts/pre-deploy-validation.sh [environment]
# Example: ./scripts/pre-deploy-validation.sh production
#

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-production}
ERRORS=0

echo "========================================================================"
echo "Pre-Deployment Validation for ${ENVIRONMENT} Environment"
echo "========================================================================"
echo ""

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "1. Pulling environment variables from Vercel..."
vercel env pull ".env.${ENVIRONMENT}.temp" --environment="${ENVIRONMENT}" --scope mikeyoung304-gmailcoms-projects --yes --token="$VERCEL_TOKEN" > /dev/null 2>&1
success "Environment variables pulled"
echo ""

echo "2. Checking for embedded newlines in environment variables..."
if grep -q '\\n"' ".env.${ENVIRONMENT}.temp"; then
    error "Found embedded newlines in environment variables:"
    grep '\\n"' ".env.${ENVIRONMENT}.temp" | sed 's/^/    /'
    echo ""
    echo "    Fix with: ./scripts/fix-vercel-env-newlines.sh"
else
    success "No embedded newlines found"
fi
echo ""

echo "3. Validating required environment variables..."

# Check for required Supabase variables
if grep -q "VITE_SUPABASE_URL=" ".env.${ENVIRONMENT}.temp"; then
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" ".env.${ENVIRONMENT}.temp" | cut -d'=' -f2- | tr -d '"')
    if [[ "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
        success "VITE_SUPABASE_URL is valid: $SUPABASE_URL"
    else
        error "VITE_SUPABASE_URL is invalid: $SUPABASE_URL"
    fi
else
    error "VITE_SUPABASE_URL is missing"
fi

if grep -q "VITE_SUPABASE_ANON_KEY=" ".env.${ENVIRONMENT}.temp"; then
    success "VITE_SUPABASE_ANON_KEY is present"
else
    error "VITE_SUPABASE_ANON_KEY is missing"
fi

# Check for required restaurant ID
if grep -q "VITE_DEFAULT_RESTAURANT_ID=" ".env.${ENVIRONMENT}.temp"; then
    RESTAURANT_ID=$(grep "VITE_DEFAULT_RESTAURANT_ID=" ".env.${ENVIRONMENT}.temp" | cut -d'=' -f2- | tr -d '"')

    # Check if it's a UUID or slug
    if [[ "$RESTAURANT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
        success "VITE_DEFAULT_RESTAURANT_ID is a valid UUID: $RESTAURANT_ID"
    elif [[ "$RESTAURANT_ID" =~ ^[a-z0-9-]+$ ]]; then
        success "VITE_DEFAULT_RESTAURANT_ID is a valid slug: $RESTAURANT_ID"
    else
        error "VITE_DEFAULT_RESTAURANT_ID is invalid: $RESTAURANT_ID"
        echo "    Must be a UUID or lowercase alphanumeric slug"
    fi
else
    error "VITE_DEFAULT_RESTAURANT_ID is missing"
fi

# Check for API base URL
if grep -q "VITE_API_BASE_URL=" ".env.${ENVIRONMENT}.temp"; then
    API_URL=$(grep "VITE_API_BASE_URL=" ".env.${ENVIRONMENT}.temp" | cut -d'=' -f2- | tr -d '"')
    if [[ "$API_URL" =~ ^https:// ]]; then
        success "VITE_API_BASE_URL is valid: $API_URL"
    else
        warning "VITE_API_BASE_URL should use HTTPS: $API_URL"
    fi
else
    warning "VITE_API_BASE_URL not set (will default to window.location.origin)"
fi

echo ""

echo "4. Validating configuration format..."

# Check for common typos
if grep -qi "locahost" ".env.${ENVIRONMENT}.temp"; then
    error "Found typo 'locahost' (should be 'localhost')"
fi

if grep -qi "supabase\.co\.co" ".env.${ENVIRONMENT}.temp"; then
    error "Found duplicate domain '.co.co' in Supabase URL"
fi

# Check for localhost in production
if [[ "$ENVIRONMENT" == "production" ]]; then
    if grep -q "localhost" ".env.${ENVIRONMENT}.temp"; then
        error "Found 'localhost' in production environment"
        grep "localhost" ".env.${ENVIRONMENT}.temp" | sed 's/^/    /'
    else
        success "No localhost references in production"
    fi
fi

echo ""

echo "5. Checking for potentially sensitive data..."

# Check if passwords or secrets are exposed
if grep -qi "password=" ".env.${ENVIRONMENT}.temp"; then
    warning "Found 'password=' in environment variables"
fi

if grep -qi "_SECRET=" ".env.${ENVIRONMENT}.temp" | grep -v "ANON_KEY"; then
    warning "Found '_SECRET=' variables (ensure they're encrypted)"
fi

success "Sensitive data check complete"
echo ""

echo "6. Validating build configuration..."

# Check package.json scripts
if [ -f "package.json" ]; then
    if grep -q '"build"' package.json; then
        success "Build script exists in package.json"
    else
        error "No build script found in package.json"
    fi
fi

# Check vercel.json
if [ -f "vercel.json" ]; then
    success "vercel.json configuration exists"

    # Validate JSON syntax
    if command -v node &> /dev/null; then
        if node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))" 2>/dev/null; then
            success "vercel.json has valid JSON syntax"
        else
            error "vercel.json has invalid JSON syntax"
        fi
    fi
else
    warning "No vercel.json configuration found"
fi

echo ""

echo "7. Running tests..."
if npm run test:ci > /dev/null 2>&1; then
    success "Tests passed"
elif npm run test > /dev/null 2>&1; then
    success "Tests passed"
else
    error "Tests failed - run 'npm test' for details"
fi

echo ""

# Cleanup
rm -f ".env.${ENVIRONMENT}.temp"

echo "========================================================================"
echo "Validation Summary"
echo "========================================================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo ""
    echo "Safe to deploy to $ENVIRONMENT"
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Fix the errors above before deploying to $ENVIRONMENT"
    exit 1
fi
