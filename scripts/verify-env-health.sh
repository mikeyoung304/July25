#!/bin/bash
# Environment Variable Health Check Script
# Verifies local .env file against requirements
# Usage: ./scripts/verify-env-health.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Environment Variable Health Check${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ CRITICAL: .env file not found in root directory${NC}"
    echo -e "${YELLOW}  → Create .env file from .env.example${NC}"
    exit 1
fi

echo -e "${GREEN}✓ .env file found${NC}"
echo ""

# Function to check if variable exists
check_var_exists() {
    local var_name=$1
    local required=$2
    local description=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if grep -q "^${var_name}=" .env; then
        local value=$(grep "^${var_name}=" .env | cut -d'=' -f2-)

        # Remove quotes if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        if [ -z "$value" ]; then
            if [ "$required" == "REQUIRED" ]; then
                echo -e "${RED}✗ $var_name is set but empty${NC}"
                echo -e "${YELLOW}  → $description${NC}"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            else
                echo -e "${YELLOW}⚠ $var_name is set but empty (optional)${NC}"
                WARNING_CHECKS=$((WARNING_CHECKS + 1))
            fi
        else
            echo -e "${GREEN}✓ $var_name${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))

            # Return value for further validation
            echo "$value"
        fi
    else
        if [ "$required" == "REQUIRED" ]; then
            echo -e "${RED}✗ $var_name is missing${NC}"
            echo -e "${YELLOW}  → $description${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "${YELLOW}⚠ $var_name is missing (optional)${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
    fi
}

# Function to check variable format
check_var_format() {
    local var_name=$1
    local pattern=$2
    local error_msg=$3

    if grep -q "^${var_name}=" .env; then
        local value=$(grep "^${var_name}=" .env | cut -d'=' -f2-)
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        if [[ ! $value =~ $pattern ]]; then
            echo -e "${RED}  ✗ Format error: $error_msg${NC}"
            echo -e "${YELLOW}    Current value: $value${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    fi
}

# Check for newline contamination
check_newline_contamination() {
    echo -e "${BLUE}Checking for newline contamination...${NC}"

    if grep -q '\\n' .env; then
        echo -e "${RED}✗ CRITICAL: Found literal \\n in .env file${NC}"
        echo -e "${YELLOW}  Affected variables:${NC}"
        grep '\\n' .env | while read -r line; do
            echo -e "${YELLOW}    $line${NC}"
        done
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    else
        echo -e "${GREEN}✓ No newline contamination found${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo ""
}

echo -e "${BLUE}=== Core Configuration ===${NC}"
check_var_exists "NODE_ENV" "REQUIRED" "Must be 'development', 'production', or 'staging'"
check_var_exists "PORT" "REQUIRED" "Backend port number (default: 3001)"
check_var_exists "DEFAULT_RESTAURANT_ID" "REQUIRED" "UUID format for backend"
check_var_format "DEFAULT_RESTAURANT_ID" "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" "Must be UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
echo ""

echo -e "${BLUE}=== Database & Supabase ===${NC}"
check_var_exists "DATABASE_URL" "REQUIRED" "PostgreSQL connection string"
check_var_exists "SUPABASE_URL" "REQUIRED" "Supabase project URL"
check_var_exists "SUPABASE_ANON_KEY" "REQUIRED" "Supabase anonymous key"
check_var_exists "SUPABASE_SERVICE_KEY" "REQUIRED" "Supabase service role key"
check_var_exists "SUPABASE_JWT_SECRET" "REQUIRED" "CRITICAL: Required for auth v6.0.5+"

# Check DATABASE_URL format
if grep -q "^DATABASE_URL=" .env; then
    db_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
    if [[ $db_url == *":5432/"* ]]; then
        echo -e "${YELLOW}⚠ WARNING: DATABASE_URL uses port 5432 (direct connection)${NC}"
        echo -e "${YELLOW}  → For serverless (Render), use port 6543 with pgbouncer=true${NC}"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    elif [[ $db_url == *":6543/"* ]]; then
        echo -e "${GREEN}  ✓ DATABASE_URL uses port 6543 (pooler)${NC}"
    fi
fi
echo ""

echo -e "${BLUE}=== Client Variables (VITE_ prefix) ===${NC}"
check_var_exists "VITE_API_BASE_URL" "REQUIRED" "Backend API URL"
check_var_exists "VITE_SUPABASE_URL" "REQUIRED" "Supabase URL for client"
check_var_exists "VITE_SUPABASE_ANON_KEY" "REQUIRED" "Supabase anon key for client"
check_var_exists "VITE_DEFAULT_RESTAURANT_ID" "REQUIRED" "Restaurant ID for client (can be slug or UUID)"
check_var_exists "VITE_ENVIRONMENT" "REQUIRED" "Environment indicator"

# Check VITE_DEMO_PANEL
if grep -q "^VITE_DEMO_PANEL=" .env; then
    demo_panel=$(grep "^VITE_DEMO_PANEL=" .env | cut -d'=' -f2-)
    demo_panel=$(echo "$demo_panel" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    if [ "$demo_panel" == "1" ]; then
        env_value=$(grep "^NODE_ENV=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')
        if [ "$env_value" == "production" ]; then
            echo -e "${RED}✗ CRITICAL: VITE_DEMO_PANEL=1 in production environment${NC}"
            echo -e "${YELLOW}  → MUST be 0 in production (exposes demo credentials)${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "${GREEN}✓ VITE_DEMO_PANEL=1 (OK for development)${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    else
        echo -e "${GREEN}✓ VITE_DEMO_PANEL=0${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi
echo ""

echo -e "${BLUE}=== Authentication & Security ===${NC}"
check_var_exists "KIOSK_JWT_SECRET" "REQUIRED" "JWT secret for kiosk auth (min 32 chars)"
check_var_exists "PIN_PEPPER" "REQUIRED" "Pepper for PIN hashing (min 32 chars)"
check_var_exists "DEVICE_FINGERPRINT_SALT" "REQUIRED" "Salt for device fingerprinting (min 32 chars)"
check_var_exists "STATION_TOKEN_SECRET" "REQUIRED" "Secret for station tokens (min 32 chars)"
check_var_exists "FRONTEND_URL" "REQUIRED" "Frontend URL for CORS"

# Check secret lengths
for secret in KIOSK_JWT_SECRET PIN_PEPPER DEVICE_FINGERPRINT_SALT STATION_TOKEN_SECRET; do
    if grep -q "^${secret}=" .env; then
        value=$(grep "^${secret}=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')
        length=${#value}
        if [ $length -lt 32 ]; then
            echo -e "${RED}  ✗ $secret is too short ($length chars, need 32+)${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "${GREEN}  ✓ $secret length OK ($length chars)${NC}"
        fi
    fi
done

# Check STRICT_AUTH
check_var_exists "STRICT_AUTH" "OPTIONAL" "Multi-tenant security (recommended: true for production)"
echo ""

echo -e "${BLUE}=== Stripe Payment ===${NC}"
check_var_exists "STRIPE_SECRET_KEY" "OPTIONAL" "Stripe secret key (sk_test_* or sk_live_*)"
check_var_exists "STRIPE_WEBHOOK_SECRET" "OPTIONAL" "Stripe webhook secret (whsec_*)"
check_var_exists "VITE_STRIPE_PUBLISHABLE_KEY" "OPTIONAL" "Stripe publishable key (pk_test_* or pk_live_*)"

# Check Stripe key consistency
if grep -q "^STRIPE_SECRET_KEY=" .env; then
    stripe_key=$(grep "^STRIPE_SECRET_KEY=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')
    node_env=$(grep "^NODE_ENV=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

    if [[ $stripe_key == sk_live_* ]]; then
        echo -e "${GREEN}✓ STRIPE_SECRET_KEY is production key${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [[ $stripe_key == sk_test_* ]]; then
        if [ "$node_env" == "production" ]; then
            echo -e "${YELLOW}⚠ WARNING: STRIPE_SECRET_KEY is test key in production${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        else
            echo -e "${GREEN}✓ STRIPE_SECRET_KEY is test key (valid for development)${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    elif [[ $stripe_key == "demo" ]]; then
        echo -e "${GREEN}✓ STRIPE_SECRET_KEY=demo (demo mode enabled)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# Check publishable key matches secret key environment
if grep -q "^VITE_STRIPE_PUBLISHABLE_KEY=" .env && grep -q "^STRIPE_SECRET_KEY=" .env; then
    vite_stripe_key=$(grep "^VITE_STRIPE_PUBLISHABLE_KEY=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')
    stripe_key=$(grep "^STRIPE_SECRET_KEY=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

    if [[ $vite_stripe_key == pk_live_* ]] && [[ $stripe_key == sk_test_* ]]; then
        echo -e "${RED}✗ Stripe key mismatch: publishable is live but secret is test${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    elif [[ $vite_stripe_key == pk_test_* ]] && [[ $stripe_key == sk_live_* ]]; then
        echo -e "${RED}✗ Stripe key mismatch: publishable is test but secret is live${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    else
        echo -e "${GREEN}✓ Stripe keys are consistent (both test or both live)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi
echo ""

echo -e "${BLUE}=== OpenAI Configuration ===${NC}"
check_var_exists "OPENAI_API_KEY" "OPTIONAL" "OpenAI API key for voice ordering"
check_var_exists "OPENAI_REALTIME_MODEL" "OPTIONAL" "OpenAI realtime model name"
check_var_exists "VITE_OPENAI_API_KEY" "OPTIONAL" "OpenAI API key for client-side voice"
echo ""

echo -e "${BLUE}=== Feature Flags ===${NC}"
check_var_exists "AUTH_DUAL_AUTH_ENABLE" "OPTIONAL" "Support both auth methods"
check_var_exists "AUTH_ACCEPT_KIOSK_DEMO_ALIAS" "OPTIONAL" "Accept legacy kiosk_demo role"
check_var_exists "LOG_LEVEL" "OPTIONAL" "Logging level (debug|info|warn|error)"
check_var_exists "SENTRY_DSN" "OPTIONAL" "Sentry error tracking"
echo ""

# Check for newline contamination
check_newline_contamination

# Check ALLOWED_ORIGINS format
echo -e "${BLUE}=== CORS Configuration ===${NC}"
if grep -q "^ALLOWED_ORIGINS=" .env; then
    origins=$(grep "^ALLOWED_ORIGINS=" .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

    echo -e "${GREEN}✓ ALLOWED_ORIGINS is set${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [[ $origins == *"vercel.app"* ]]; then
        if [[ ! $origins == *"*.vercel.app"* ]]; then
            echo -e "${YELLOW}⚠ WARNING: ALLOWED_ORIGINS includes Vercel but missing wildcard${NC}"
            echo -e "${YELLOW}  → Add https://*.vercel.app for preview deployments${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        else
            echo -e "${GREEN}  ✓ ALLOWED_ORIGINS includes wildcard for Vercel previews${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ ALLOWED_ORIGINS not set (using default)${NC}"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"

    if [ $WARNING_CHECKS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Some warnings found - review recommended${NC}"
        exit 0
    else
        echo -e "${GREEN}✓ No warnings - configuration looks good!${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ $FAILED_CHECKS critical issue(s) found${NC}"
    echo -e "${YELLOW}Please fix the issues above before deploying${NC}"
    exit 1
fi
