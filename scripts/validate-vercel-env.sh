#!/bin/bash
# Vercel Environment Validation Script
# Purpose: Validate Vercel production/preview environment variables
# Usage: ./scripts/validate-vercel-env.sh [production|preview]

set -euo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-production}"
ERRORS=0
WARNINGS=0
PASSES=0

# Helper functions
error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ((ERRORS++))
}

warn() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSES++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗ Vercel CLI not installed${NC}"
    echo "Install with: npm install -g vercel"
    exit 1
fi

header "Vercel Environment Validation - $ENVIRONMENT"

# Pull current environment variables
info "Pulling environment variables from Vercel..."
vercel env pull ".env.vercel.$ENVIRONMENT" --environment="$ENVIRONMENT" --yes 2>/dev/null || {
    error "Failed to pull environment variables from Vercel"
    error "Run 'vercel' to link project first"
    exit 1
}

ENV_FILE=".env.vercel.$ENVIRONMENT"

if [[ ! -f "$ENV_FILE" ]]; then
    error "Failed to create $ENV_FILE"
    exit 1
fi

# Helper to check variable in Vercel env file
check_var() {
    local var_name="$1"
    grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null
}

# Helper to get variable value
get_var() {
    local var_name="$1"
    grep "^${var_name}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"'
}

# 1. Required Frontend Variables
header "1. Required Frontend Variables (VITE_)"

required_vite_vars=(
    "VITE_API_BASE_URL"
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "VITE_DEFAULT_RESTAURANT_ID"
    "VITE_ENVIRONMENT"
)

for var in "${required_vite_vars[@]}"; do
    if check_var "$var"; then
        value=$(get_var "$var")
        if [[ -z "$value" ]]; then
            error "$var is set but empty"
        else
            success "$var is set"
        fi
    else
        error "$var is MISSING (required for frontend)"
    fi
done

# 2. Forbidden Secret Variables
header "2. Security: Forbidden VITE_ Secrets Check"

forbidden_vars=(
    "VITE_OPENAI_API_KEY"
    "VITE_SUPABASE_SERVICE_KEY"
    "VITE_SUPABASE_JWT_SECRET"
    "VITE_DATABASE_URL"
    "VITE_SQUARE_ACCESS_TOKEN"
    "VITE_PIN_PEPPER"
    "VITE_KIOSK_JWT_SECRET"
)

for var in "${forbidden_vars[@]}"; do
    if check_var "$var"; then
        error "$var is set (CRITICAL: Secret exposed to browser!)"
    else
        success "$var is not set (good)"
    fi
done

# 3. Demo Panel Security
header "3. Demo Panel Security Check"

if check_var "VITE_DEMO_PANEL"; then
    demo_value=$(get_var "VITE_DEMO_PANEL")

    # Remove trailing newline
    demo_value=$(echo "$demo_value" | tr -d '\n')

    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ "$demo_value" == "1" ]] || [[ "$demo_value" == "true" ]]; then
            error "VITE_DEMO_PANEL=$demo_value in production (exposes demo credentials!)"
            error "Fix with: vercel env rm VITE_DEMO_PANEL production && vercel env add VITE_DEMO_PANEL production"
            error "Enter value: 0"
        else
            success "VITE_DEMO_PANEL=$demo_value (disabled)"
        fi
    else
        if [[ "$demo_value" == "1" ]] || [[ "$demo_value" == "true" ]]; then
            success "VITE_DEMO_PANEL=$demo_value in $ENVIRONMENT (acceptable for non-production)"
        else
            success "VITE_DEMO_PANEL=$demo_value (disabled)"
        fi
    fi
else
    info "VITE_DEMO_PANEL not set (defaults to 0)"
fi

# 4. Trailing Newline Check
header "4. Trailing Newline Bug Check"

check_newline_vars=(
    "VITE_DEFAULT_RESTAURANT_ID"
    "VITE_ENVIRONMENT"
    "VITE_FEATURE_NEW_CUSTOMER_ID_FLOW"
    "STRICT_AUTH"
)

for var in "${check_newline_vars[@]}"; do
    if check_var "$var"; then
        raw_value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)

        # Check if value ends with \n or has trailing newline
        if [[ "$raw_value" =~ \\n\" ]] || [[ "$raw_value" =~ $'\n'$ ]]; then
            error "$var has trailing newline (will cause string comparison bugs)"
            warn "Fix with: vercel env rm $var $ENVIRONMENT && vercel env add $var $ENVIRONMENT"
        else
            success "$var has no trailing newline"
        fi
    fi
done

# 5. Environment-Specific Checks
header "5. Environment-Specific Configuration"

if check_var "VITE_ENVIRONMENT"; then
    vite_env=$(get_var "VITE_ENVIRONMENT")

    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ "$vite_env" == "production" ]]; then
            success "VITE_ENVIRONMENT=production (correct)"
        else
            error "VITE_ENVIRONMENT=$vite_env but deploying to production"
        fi
    elif [[ "$ENVIRONMENT" == "preview" ]]; then
        if [[ "$vite_env" == "production" ]] || [[ "$vite_env" == "preview" ]]; then
            success "VITE_ENVIRONMENT=$vite_env (acceptable for preview)"
        else
            warn "VITE_ENVIRONMENT=$vite_env in preview environment"
        fi
    fi
fi

# 6. API Base URL Validation
header "6. API Base URL Validation"

if check_var "VITE_API_BASE_URL"; then
    api_url=$(get_var "VITE_API_BASE_URL")

    if [[ "$api_url" =~ ^https:// ]]; then
        success "VITE_API_BASE_URL=$api_url (HTTPS)"
    elif [[ "$api_url" =~ ^http://localhost ]]; then
        if [[ "$ENVIRONMENT" == "production" ]]; then
            error "VITE_API_BASE_URL points to localhost in production"
        else
            warn "VITE_API_BASE_URL points to localhost"
        fi
    else
        warn "VITE_API_BASE_URL=$api_url (not HTTPS)"
    fi

    # Check if URL is reachable (optional)
    if command -v curl &> /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" "$api_url/health" 2>/dev/null | grep -q "200"; then
            success "API endpoint is reachable at $api_url"
        else
            warn "Cannot reach API at $api_url (may be normal if backend not deployed yet)"
        fi
    fi
fi

# 7. Supabase Configuration
header "7. Supabase Configuration"

if check_var "VITE_SUPABASE_URL"; then
    supabase_url=$(get_var "VITE_SUPABASE_URL")

    if [[ "$supabase_url" =~ ^https://.*\.supabase\.co$ ]]; then
        success "VITE_SUPABASE_URL format is correct"
    else
        error "VITE_SUPABASE_URL=$supabase_url (invalid format, should be https://xxx.supabase.co)"
    fi
fi

if check_var "VITE_SUPABASE_ANON_KEY"; then
    anon_key=$(get_var "VITE_SUPABASE_ANON_KEY")

    if [[ ${#anon_key} -gt 100 ]]; then
        success "VITE_SUPABASE_ANON_KEY appears valid (${#anon_key} chars)"
    else
        error "VITE_SUPABASE_ANON_KEY is too short (${#anon_key} chars)"
    fi
fi

# Summary
header "VALIDATION SUMMARY - $ENVIRONMENT"

echo ""
echo -e "${GREEN}Passed:${NC}   $PASSES"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Errors:${NC}   $ERRORS"
echo ""

# Clean up temporary file
rm -f "$ENV_FILE"

if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  VALIDATION FAILED - $ERRORS error(s) in Vercel $ENVIRONMENT${NC}"
    echo -e "${RED}║  DO NOT DEPLOY until errors are resolved${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  VALIDATION PASSED WITH WARNINGS - $WARNINGS warning(s)${NC}"
    echo -e "${YELLOW}║  Review before deploying to $ENVIRONMENT${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  VALIDATION PASSED - Vercel $ENVIRONMENT is ready${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
fi
