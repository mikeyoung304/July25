#!/bin/bash
#
# Post-Deployment Smoke Tests
# Verifies critical paths work after deployment
# Created: 2025-11-06
#
# Usage: ./scripts/smoke-test.sh [url]
# Example: ./scripts/smoke-test.sh https://july25-client.vercel.app
#

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL=${1:-https://july25-client.vercel.app}
API_URL=${2:-https://july25.onrender.com}
ERRORS=0
WARNINGS=0

echo "========================================================================"
echo "Post-Deployment Smoke Tests"
echo "========================================================================"
echo ""
echo "Testing:"
echo "  Frontend: $BASE_URL"
echo "  Backend:  $API_URL"
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
    ((WARNINGS++))
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Function to test HTTP endpoint
test_http() {
    local url=$1
    local expected_code=${2:-200}
    local description=$3

    info "Testing: $description"
    echo "   URL: $url"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" == "$expected_code" ]; then
        success "Returned $HTTP_CODE (expected $expected_code)"
    else
        error "Returned $HTTP_CODE (expected $expected_code)"
    fi
    echo ""
}

# Function to test API endpoint with JSON response
test_api() {
    local url=$1
    local description=$2

    info "Testing API: $description"
    echo "   URL: $url"

    RESPONSE=$(curl -s "$url" 2>/dev/null)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" == "200" ]; then
        # Check if response is valid JSON
        if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
            success "API returned valid JSON (HTTP $HTTP_CODE)"
        else
            warning "API returned HTTP $HTTP_CODE but invalid JSON"
        fi
    else
        error "API returned HTTP $HTTP_CODE"
    fi
    echo ""
}

echo "========================================================================"
echo "1. Frontend Health Checks"
echo "========================================================================"
echo ""

# Test homepage loads
test_http "$BASE_URL" 200 "Homepage loads"

# Test static assets
test_http "$BASE_URL/favicon.ico" 200 "Favicon exists" || true
test_http "$BASE_URL/macon-logo.png" 200 "Logo exists" || true

# Test routing
test_http "$BASE_URL/grow/order" 200 "Restaurant slug routing" || warning "Restaurant page not accessible"

echo "========================================================================"
echo "2. Backend API Health Checks"
echo "========================================================================"
echo ""

# Test API health endpoint
test_api "$API_URL/api/v1/health" "Backend health endpoint"

# Test API base endpoint
test_http "$API_URL/api/v1" 200 "API base endpoint"

echo "========================================================================"
echo "3. Authentication Endpoints"
echo "========================================================================"
echo ""

# Test auth/me endpoint (should return 401 without auth)
test_http "$API_URL/api/v1/auth/me" 401 "Auth endpoint (unauthenticated)"

# Test that auth endpoints exist
test_http "$API_URL/api/v1/auth/pin-login" 405 "PIN login endpoint exists" || test_http "$API_URL/api/v1/auth/pin-login" 400 "PIN login endpoint exists"

echo "========================================================================"
echo "4. CORS Configuration"
echo "========================================================================"
echo ""

info "Testing CORS headers"
CORS_HEADER=$(curl -s -I -X OPTIONS "$API_URL/api/v1/health" | grep -i "access-control-allow-origin" || echo "Not found")

if [[ "$CORS_HEADER" == *"*"* ]]; then
    warning "CORS allows all origins (*) - security risk"
elif [[ "$CORS_HEADER" == *"$BASE_URL"* ]]; then
    success "CORS properly configured for frontend"
else
    error "CORS not configured correctly"
fi
echo ""

echo "========================================================================"
echo "5. Security Headers"
echo "========================================================================"
echo ""

info "Checking security headers on frontend"
HEADERS=$(curl -s -I "$BASE_URL" 2>/dev/null)

# Check for HSTS
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    success "HSTS header present"
else
    warning "HSTS header missing"
fi

# Check for X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
    success "X-Frame-Options header present"
else
    warning "X-Frame-Options header missing"
fi

# Check for X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    success "X-Content-Type-Options header present"
else
    warning "X-Content-Type-Options header missing"
fi

# Check for Content-Security-Policy
if echo "$HEADERS" | grep -qi "content-security-policy"; then
    success "Content-Security-Policy header present"
else
    warning "Content-Security-Policy header missing"
fi

echo ""

echo "========================================================================"
echo "6. Environment Configuration"
echo "========================================================================"
echo ""

info "Testing environment variable configuration"

# Check that the page loads without errors
PAGE_CONTENT=$(curl -s "$BASE_URL/grow/order" 2>/dev/null)

if echo "$PAGE_CONTENT" | grep -q "<!doctype html"; then
    success "Restaurant page renders HTML"
else
    error "Restaurant page doesn't render properly"
fi

# Check for JavaScript errors in console (basic check)
if echo "$PAGE_CONTENT" | grep -qi "error\|exception"; then
    warning "Possible JavaScript errors in page source"
fi

echo ""

echo "========================================================================"
echo "7. Database Connectivity (via API)"
echo "========================================================================"
echo ""

# Test menu endpoint as a proxy for database connectivity
test_api "$API_URL/api/v1/menu" "Menu endpoint (database query)"

echo "========================================================================"
echo "Smoke Test Summary"
echo "========================================================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    echo ""
    echo "Deployment appears healthy"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Passed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Deployment is functional but has warnings"
    echo "Review the warnings above"
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Deployment may have issues"
    echo "Review the errors above and consider rollback"
    exit 1
fi
