#!/bin/bash
# Vercel Environment Variables Verification Script
# Checks Vercel production environment against requirements
# Usage: ./scripts/verify-vercel-env.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Vercel Environment Verification${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗ Vercel CLI not found${NC}"
    echo -e "${YELLOW}  → Install with: npm install -g vercel${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI found${NC}"
echo ""

# Pull production environment variables
echo -e "${BLUE}Pulling Vercel production environment...${NC}"
vercel env pull .env.vercel.check --environment=production 2>/dev/null || vercel env pull .env.vercel.check production

if [ ! -f ".env.vercel.check" ]; then
    echo -e "${RED}✗ Failed to pull Vercel environment${NC}"
    echo -e "${YELLOW}  → Run 'vercel login' first${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Production environment pulled to .env.vercel.check${NC}"
echo ""

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to check if variable exists in Vercel env
check_vercel_var() {
    local var_name=$1
    local required=$2
    local description=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if grep -q "^${var_name}=" .env.vercel.check; then
        local value=$(grep "^${var_name}=" .env.vercel.check | cut -d'=' -f2-)

        # Remove quotes if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        if [ -z "$value" ]; then
            if [ "$required" == "REQUIRED" ]; then
                echo -e "${RED}✗ $var_name is set but empty${NC}"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            else
                echo -e "${YELLOW}⚠ $var_name is set but empty (optional)${NC}"
                WARNING_CHECKS=$((WARNING_CHECKS + 1))
            fi
        else
            echo -e "${GREEN}✓ $var_name${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    else
        if [ "$required" == "REQUIRED" ]; then
            echo -e "${RED}✗ $var_name is missing${NC}"
            echo -e "${YELLOW}  → $description${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "${YELLOW}⚠ $var_name is missing (optional)${NC}"
            echo -e "${YELLOW}  → $description${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
    fi
}

# Check for newline contamination
echo -e "${BLUE}=== Checking for newline contamination ===${NC}"
if grep -q '\\n' .env.vercel.check; then
    echo -e "${RED}✗ CRITICAL: Found literal \\n in Vercel environment${NC}"
    echo -e "${YELLOW}  Affected variables:${NC}"
    grep '\\n' .env.vercel.check | while read -r line; do
        var_name=$(echo "$line" | cut -d'=' -f1)
        echo -e "${YELLOW}    $var_name${NC}"
    done
    echo -e "${YELLOW}  → Fix in Vercel Dashboard by re-entering these values${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
    echo -e "${GREEN}✓ No newline contamination found${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Check VITE_DEMO_PANEL
echo -e "${BLUE}=== Security Checks ===${NC}"
if grep -q "^VITE_DEMO_PANEL=" .env.vercel.check; then
    demo_panel=$(grep "^VITE_DEMO_PANEL=" .env.vercel.check | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

    if [ "$demo_panel" == "1" ]; then
        echo -e "${RED}✗ CRITICAL: VITE_DEMO_PANEL=1 in production${NC}"
        echo -e "${YELLOW}  → MUST be 0 to hide demo credentials${NC}"
        echo -e "${YELLOW}  → Fix in Vercel Dashboard → Settings → Environment Variables${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    elif [ "$demo_panel" == "0" ]; then
        echo -e "${GREEN}✓ VITE_DEMO_PANEL=0 (secure)${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠ VITE_DEMO_PANEL has unexpected value: $demo_panel${NC}"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
else
    echo -e "${YELLOW}⚠ VITE_DEMO_PANEL not set${NC}"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi
echo ""

# Check required VITE_ variables
echo -e "${BLUE}=== Core Client Variables ===${NC}"
check_vercel_var "VITE_API_BASE_URL" "REQUIRED" "Backend API URL (e.g., https://july25.onrender.com)"
check_vercel_var "VITE_SUPABASE_URL" "REQUIRED" "Supabase project URL"
check_vercel_var "VITE_SUPABASE_ANON_KEY" "REQUIRED" "Supabase anonymous key"
check_vercel_var "VITE_DEFAULT_RESTAURANT_ID" "REQUIRED" "Default restaurant (can be slug)"
check_vercel_var "VITE_ENVIRONMENT" "REQUIRED" "Environment indicator (production)"
echo ""

# Check VITE_API_BASE_URL format
if grep -q "^VITE_API_BASE_URL=" .env.vercel.check; then
    api_url=$(grep "^VITE_API_BASE_URL=" .env.vercel.check | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

    if [[ $api_url == "http://localhost"* ]]; then
        echo -e "${RED}  ✗ VITE_API_BASE_URL still points to localhost${NC}"
        echo -e "${YELLOW}    → Should be production URL (e.g., https://july25.onrender.com)${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    elif [[ $api_url == "https://"* ]]; then
        echo -e "${GREEN}  ✓ VITE_API_BASE_URL uses HTTPS${NC}"
    else
        echo -e "${YELLOW}  ⚠ VITE_API_BASE_URL format unexpected: $api_url${NC}"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
fi

echo -e "${BLUE}=== Square Payment Variables ===${NC}"
check_vercel_var "VITE_SQUARE_APP_ID" "OPTIONAL" "Square App ID for payment UI"
check_vercel_var "VITE_SQUARE_LOCATION_ID" "OPTIONAL" "Square Location ID"
check_vercel_var "VITE_SQUARE_ENVIRONMENT" "OPTIONAL" "sandbox or production"

# Check Square environment consistency
if grep -q "^VITE_SQUARE_ENVIRONMENT=" .env.vercel.check; then
    square_env=$(grep "^VITE_SQUARE_ENVIRONMENT=" .env.vercel.check | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

    if [ "$square_env" == "production" ]; then
        echo -e "${GREEN}  ✓ Square configured for production${NC}"

        if grep -q "^VITE_SQUARE_APP_ID=" .env.vercel.check; then
            app_id=$(grep "^VITE_SQUARE_APP_ID=" .env.vercel.check | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')

            if [[ $app_id == "sandbox-"* ]]; then
                echo -e "${RED}  ✗ WARNING: Using sandbox app ID in production environment${NC}"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
        fi
    elif [ "$square_env" == "sandbox" ]; then
        echo -e "${YELLOW}  ⚠ Square in sandbox mode (not accepting real payments)${NC}"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
fi
echo ""

echo -e "${BLUE}=== Voice/AI Variables ===${NC}"
check_vercel_var "VITE_OPENAI_API_KEY" "OPTIONAL" "OpenAI API key for client-side voice"
check_vercel_var "VITE_OPENAI_REALTIME_MODEL" "OPTIONAL" "OpenAI realtime model"
echo ""

echo -e "${BLUE}=== Feature Flags ===${NC}"
check_vercel_var "VITE_USE_MOCK_DATA" "OPTIONAL" "Use mock data flag"
check_vercel_var "VITE_USE_REALTIME_VOICE" "OPTIONAL" "Enable voice features"
check_vercel_var "VITE_ENABLE_PERF" "OPTIONAL" "Performance monitoring"
check_vercel_var "VITE_DEBUG_VOICE" "OPTIONAL" "Voice debugging"
check_vercel_var "VITE_FEATURE_NEW_CUSTOMER_ID_FLOW" "OPTIONAL" "New customer ID flow"
echo ""

# Check for non-VITE variables (should not be in Vercel)
echo -e "${BLUE}=== Security: Checking for server-only variables ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

server_only_vars=(
    "DATABASE_URL"
    "SUPABASE_SERVICE_KEY"
    "SUPABASE_JWT_SECRET"
    "KIOSK_JWT_SECRET"
    "PIN_PEPPER"
    "DEVICE_FINGERPRINT_SALT"
    "STATION_TOKEN_SECRET"
    "OPENAI_API_KEY"
)

found_server_vars=0
for var in "${server_only_vars[@]}"; do
    if grep -q "^${var}=" .env.vercel.check; then
        echo -e "${RED}✗ SECURITY RISK: $var found in Vercel environment${NC}"
        echo -e "${YELLOW}  → This should only be in Render backend${NC}"
        found_server_vars=$((found_server_vars + 1))
    fi
done

if [ $found_server_vars -eq 0 ]; then
    echo -e "${GREEN}✓ No server-only variables found in Vercel (secure)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ Found $found_server_vars server-only variable(s) in Vercel${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Count total variables
echo -e "${BLUE}=== Variable Count ===${NC}"
total_vars=$(grep -c "^[A-Z]" .env.vercel.check || echo "0")
echo -e "Total variables in Vercel production: $total_vars"

if [ $total_vars -lt 5 ]; then
    echo -e "${RED}✗ Too few variables ($total_vars) - expected at least 5-8 core variables${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
elif [ $total_vars -lt 8 ]; then
    echo -e "${YELLOW}⚠ Low variable count ($total_vars) - some optional variables may be missing${NC}"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
else
    echo -e "${GREEN}✓ Variable count looks reasonable ($total_vars)${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
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

# Cleanup
echo -e "${BLUE}Cleaning up temporary file...${NC}"
rm -f .env.vercel.check
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical Vercel checks passed!${NC}"

    if [ $WARNING_CHECKS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Some warnings found - review recommended${NC}"
        exit 0
    else
        echo -e "${GREEN}✓ No warnings - Vercel configuration looks good!${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ $FAILED_CHECKS critical issue(s) found in Vercel environment${NC}"
    echo -e "${YELLOW}Please fix issues in Vercel Dashboard → Settings → Environment Variables${NC}"
    exit 1
fi
