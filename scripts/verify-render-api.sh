#!/bin/bash
# Render Backend API Verification Script
# Tests Render production backend endpoints and configuration
# Usage: ./scripts/verify-render-api.sh [backend-url]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default backend URL
BACKEND_URL="${1:-https://july25.onrender.com}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Render Backend API Verification${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "Testing backend: ${BLUE}$BACKEND_URL${NC}"
echo ""

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_status=$4
    local headers=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}Testing: $name${NC}"

    # Build curl command
    if [ -z "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BACKEND_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BACKEND_URL$endpoint" -H "$headers" 2>&1)
    fi

    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)

    # Extract body (all but last line)
    body=$(echo "$response" | head -n-1)

    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ $name - Status $status_code${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "$body"
    else
        echo -e "${RED}✗ $name - Expected $expected_status, got $status_code${NC}"
        echo -e "${YELLOW}Response: $body${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Test 1: Health Check
echo -e "${BLUE}=== Health & Status Checks ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

health_response=$(curl -s "$BACKEND_URL/api/v1/health" 2>&1)
health_status=$?

if [ $health_status -eq 0 ]; then
    echo -e "${GREEN}✓ Health endpoint accessible${NC}"
    echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"

    # Check for expected fields
    if echo "$health_response" | grep -q '"status"'; then
        echo -e "${GREEN}  ✓ Contains status field${NC}"
    else
        echo -e "${YELLOW}  ⚠ Missing status field${NC}"
        WARNING_TESTS=$((WARNING_TESTS + 1))
    fi

    if echo "$health_response" | grep -q '"version"'; then
        version=$(echo "$health_response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}  ✓ Version: $version${NC}"
    else
        echo -e "${YELLOW}  ⚠ Missing version field${NC}"
        WARNING_TESTS=$((WARNING_TESTS + 1))
    fi

    if echo "$health_response" | grep -q '"database"'; then
        echo -e "${GREEN}  ✓ Database status included${NC}"
    fi

    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
    echo -e "${YELLOW}  Error: $health_response${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 2: Restaurant Slug Resolution
echo -e "${BLUE}=== Restaurant API ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

restaurant_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/restaurants/grow" 2>&1)
restaurant_status=$(echo "$restaurant_response" | tail -n1)
restaurant_body=$(echo "$restaurant_response" | head -n-1)

if [ "$restaurant_status" == "200" ]; then
    echo -e "${GREEN}✓ Restaurant slug resolution works${NC}"
    echo "$restaurant_body" | python3 -m json.tool 2>/dev/null || echo "$restaurant_body"

    # Check for UUID in response
    if echo "$restaurant_body" | grep -q '"id":"[0-9a-f-]*"'; then
        echo -e "${GREEN}  ✓ Restaurant ID resolved to UUID${NC}"
    fi

    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ Restaurant endpoint failed - Status $restaurant_status${NC}"
    echo -e "${YELLOW}  Response: $restaurant_body${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 3: CORS Headers
echo -e "${BLUE}=== CORS Configuration ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

cors_response=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/v1/menu" \
    -H "Origin: https://july25-client.vercel.app" \
    -H "Access-Control-Request-Method: GET" 2>&1)

if echo "$cors_response" | grep -qi "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ CORS headers present${NC}"

    allowed_origin=$(echo "$cors_response" | grep -i "Access-Control-Allow-Origin" | cut -d' ' -f2- | tr -d '\r')
    echo -e "${GREEN}  Allowed Origin: $allowed_origin${NC}"

    if echo "$cors_response" | grep -qi "Access-Control-Allow-Methods"; then
        methods=$(echo "$cors_response" | grep -i "Access-Control-Allow-Methods" | cut -d' ' -f2- | tr -d '\r')
        echo -e "${GREEN}  Allowed Methods: $methods${NC}"
    fi

    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ CORS headers missing${NC}"
    echo -e "${YELLOW}  Check ALLOWED_ORIGINS in Render environment${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 4: Auth Endpoint (without credentials - should fail gracefully)
echo -e "${BLUE}=== Authentication Endpoints ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

auth_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid","password":"invalid"}' 2>&1)

auth_status=$(echo "$auth_response" | tail -n1)
auth_body=$(echo "$auth_response" | head -n-1)

# Should return 400 or 401 for invalid credentials (not 500)
if [ "$auth_status" == "400" ] || [ "$auth_status" == "401" ]; then
    echo -e "${GREEN}✓ Auth endpoint responding correctly (rejected invalid credentials)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ "$auth_status" == "500" ]; then
    echo -e "${RED}✗ Auth endpoint returning 500 error${NC}"
    echo -e "${YELLOW}  This may indicate configuration issues${NC}"
    echo -e "${YELLOW}  Response: $auth_body${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ Auth endpoint returned unexpected status: $auth_status${NC}"
    echo -e "${YELLOW}  Response: $auth_body${NC}"
    WARNING_TESTS=$((WARNING_TESTS + 1))
fi
echo ""

# Test 5: Menu Endpoint (with restaurant header)
echo -e "${BLUE}=== Menu API ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

menu_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/menu" \
    -H "x-restaurant-id: grow" 2>&1)

menu_status=$(echo "$menu_response" | tail -n1)
menu_body=$(echo "$menu_response" | head -n-1)

if [ "$menu_status" == "200" ]; then
    echo -e "${GREEN}✓ Menu endpoint accessible${NC}"

    if echo "$menu_body" | grep -q '\['; then
        echo -e "${GREEN}  ✓ Returns array of items${NC}"

        item_count=$(echo "$menu_body" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")
        if [ "$item_count" != "unknown" ]; then
            echo -e "${GREEN}  Items in menu: $item_count${NC}"
        fi
    fi

    PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ "$menu_status" == "401" ] || [ "$menu_status" == "403" ]; then
    echo -e "${YELLOW}⚠ Menu requires authentication (status $menu_status)${NC}"
    echo -e "${YELLOW}  This is OK if auth is required for menu access${NC}"
    WARNING_TESTS=$((WARNING_TESTS + 1))
else
    echo -e "${RED}✗ Menu endpoint failed - Status $menu_status${NC}"
    echo -e "${YELLOW}  Response: $menu_body${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 6: Response Time
echo -e "${BLUE}=== Performance Check ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

start_time=$(date +%s%N)
curl -s "$BACKEND_URL/api/v1/health" > /dev/null
end_time=$(date +%s%N)

# Calculate response time in milliseconds
response_time=$(( (end_time - start_time) / 1000000 ))

if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}✓ Response time: ${response_time}ms (excellent)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ $response_time -lt 2000 ]; then
    echo -e "${GREEN}✓ Response time: ${response_time}ms (good)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ $response_time -lt 5000 ]; then
    echo -e "${YELLOW}⚠ Response time: ${response_time}ms (slow)${NC}"
    echo -e "${YELLOW}  Consider upgrading Render instance or optimizing queries${NC}"
    WARNING_TESTS=$((WARNING_TESTS + 1))
else
    echo -e "${RED}✗ Response time: ${response_time}ms (too slow)${NC}"
    echo -e "${YELLOW}  Backend may be experiencing issues${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 7: SSL/TLS
echo -e "${BLUE}=== Security Check ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [[ $BACKEND_URL == https://* ]]; then
    ssl_check=$(curl -s -I "$BACKEND_URL" 2>&1 | head -n1)

    if echo "$ssl_check" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ HTTPS enabled and working${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}⚠ HTTPS response unexpected: $ssl_check${NC}"
        WARNING_TESTS=$((WARNING_TESTS + 1))
    fi
else
    echo -e "${RED}✗ Backend not using HTTPS${NC}"
    echo -e "${YELLOW}  Production should use HTTPS${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 8: Check for common security headers
echo -e "${BLUE}=== Security Headers ===${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

headers_response=$(curl -s -I "$BACKEND_URL/api/v1/health" 2>&1)

security_headers_found=0
if echo "$headers_response" | grep -qi "X-Content-Type-Options"; then
    echo -e "${GREEN}✓ X-Content-Type-Options header present${NC}"
    security_headers_found=$((security_headers_found + 1))
fi

if echo "$headers_response" | grep -qi "X-Frame-Options"; then
    echo -e "${GREEN}✓ X-Frame-Options header present${NC}"
    security_headers_found=$((security_headers_found + 1))
fi

if echo "$headers_response" | grep -qi "Strict-Transport-Security"; then
    echo -e "${GREEN}✓ HSTS header present${NC}"
    security_headers_found=$((security_headers_found + 1))
fi

if [ $security_headers_found -gt 0 ]; then
    echo -e "${GREEN}✓ Found $security_headers_found security header(s)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ No security headers detected${NC}"
    echo -e "${YELLOW}  Consider adding security headers to backend${NC}"
    WARNING_TESTS=$((WARNING_TESTS + 1))
fi
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Backend URL: $BACKEND_URL"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical backend tests passed!${NC}"

    if [ $WARNING_TESTS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Some warnings found - review recommended${NC}"
        exit 0
    else
        echo -e "${GREEN}✓ No warnings - backend looks healthy!${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ $FAILED_TESTS test(s) failed${NC}"
    echo -e "${YELLOW}Backend may have configuration or connectivity issues${NC}"
    echo -e "${YELLOW}Check Render Dashboard → Service → Logs for more details${NC}"
    exit 1
fi
