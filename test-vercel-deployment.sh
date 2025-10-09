#!/bin/bash

# Automated Vercel Deployment Testing Script
# Tests demo login functionality and diagnoses issues

set -e

echo "=================================="
echo "Vercel Deployment Test Suite"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERCEL_URL="https://july25-client.vercel.app"
BACKEND_URL="https://july25.onrender.com"

echo "Testing URLs:"
echo "  Frontend: $VERCEL_URL"
echo "  Backend:  $BACKEND_URL"
echo ""

# Test 1: Backend Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$BACKEND_URL" || echo "timeout")
if [ "$BACKEND_STATUS" = "timeout" ]; then
  echo -e "${RED}❌ Backend is not responding (timeout)${NC}"
  echo "   The backend might be asleep or down."
  echo "   Waiting 30 seconds for it to wake up..."
  sleep 30
  BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$BACKEND_URL" || echo "timeout")
fi

if [ "$BACKEND_STATUS" = "404" ] || [ "$BACKEND_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Backend is awake and responding (HTTP $BACKEND_STATUS)${NC}"
else
  echo -e "${RED}❌ Backend returned unexpected status: $BACKEND_STATUS${NC}"
fi
echo ""

# Test 2: Frontend Loads
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Frontend Page Load"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL/login")
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Frontend /login page loads (HTTP 200)${NC}"
else
  echo -e "${RED}❌ Frontend returned HTTP $FRONTEND_STATUS${NC}"
fi
echo ""

# Test 3: Check if demo panel code is in bundle
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Demo Panel Code Presence"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGIN_HTML=$(curl -s "$VERCEL_URL/login")
if echo "$LOGIN_HTML" | grep -q "Quick Demo Access"; then
  echo -e "${GREEN}✅ Demo panel text found in HTML${NC}"
else
  echo -e "${YELLOW}⚠️  Demo panel text NOT found (might be in lazy-loaded chunk)${NC}"
fi
echo ""

# Test 4: Check JavaScript bundle for demo code
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: JavaScript Bundle Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract JS file paths from HTML
JS_FILES=$(echo "$LOGIN_HTML" | grep -o 'src="[^"]*\.js"' | sed 's/src="//g' | sed 's/"//g' | head -5)

FOUND_DEMO_CODE=false
for js_file in $JS_FILES; do
  FULL_URL="$VERCEL_URL$js_file"
  echo "  Checking: $js_file"

  JS_CONTENT=$(curl -s "$FULL_URL")

  if echo "$JS_CONTENT" | grep -q "manager@restaurant.com"; then
    echo -e "    ${GREEN}✅ Demo credentials found in bundle${NC}"
    FOUND_DEMO_CODE=true

    # Check for VITE_DEMO_PANEL
    if echo "$JS_CONTENT" | grep -q 'VITE_DEMO_PANEL.*"1"'; then
      echo -e "    ${GREEN}✅ VITE_DEMO_PANEL set to '1'${NC}"
    else
      echo -e "    ${YELLOW}⚠️  VITE_DEMO_PANEL value unclear${NC}"
    fi

    # Check for API base URL
    if echo "$JS_CONTENT" | grep -q "july25.onrender.com"; then
      echo -e "    ${GREEN}✅ Backend URL found: july25.onrender.com${NC}"
    else
      echo -e "    ${RED}❌ Backend URL not found in bundle${NC}"
    fi

    break
  fi
done

if [ "$FOUND_DEMO_CODE" = false ]; then
  echo -e "  ${YELLOW}⚠️  Demo code not found in first 5 JS files${NC}"
  echo -e "  ${YELLOW}   (May be in a lazy-loaded chunk)${NC}"
fi
echo ""

# Test 5: API Login Endpoint Test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Backend Login API Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Testing: POST $BACKEND_URL/api/v1/auth/login"

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BACKEND_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@restaurant.com",
    "password": "Demo123!",
    "restaurantId": "11111111-1111-1111-1111-111111111111"
  }')

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "  HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "  ${GREEN}✅ Login API works!${NC}"

  # Check if response has scopes
  if echo "$RESPONSE_BODY" | grep -q '"scopes"'; then
    SCOPES=$(echo "$RESPONSE_BODY" | grep -o '"scopes":\[[^]]*\]')
    echo -e "  ${GREEN}✅ Response includes scopes: $SCOPES${NC}"
  else
    echo -e "  ${RED}❌ Response missing scopes array${NC}"
  fi

  echo ""
  echo "  Response preview:"
  echo "$RESPONSE_BODY" | head -20

elif [ "$HTTP_STATUS" = "401" ]; then
  echo -e "  ${RED}❌ Login failed: Invalid credentials${NC}"
  echo "  Response: $RESPONSE_BODY"
elif [ "$HTTP_STATUS" = "404" ]; then
  echo -e "  ${RED}❌ Login endpoint not found (404)${NC}"
else
  echo -e "  ${RED}❌ Unexpected status: $HTTP_STATUS${NC}"
  echo "  Response: $RESPONSE_BODY"
fi
echo ""

# Test 6: CORS Headers Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: CORS Headers Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CORS_HEADERS=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/v1/auth/login" \
  -H "Origin: $VERCEL_URL" \
  -H "Access-Control-Request-Method: POST")

if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
  ALLOWED_ORIGIN=$(echo "$CORS_HEADERS" | grep -i "access-control-allow-origin" | cut -d: -f2- | tr -d '\r' | xargs)
  echo -e "  ${GREEN}✅ CORS headers present${NC}"
  echo "  Allowed Origin: $ALLOWED_ORIGIN"

  if [ "$ALLOWED_ORIGIN" = "*" ] || echo "$ALLOWED_ORIGIN" | grep -q "july25-client.vercel.app"; then
    echo -e "  ${GREEN}✅ Vercel domain is allowed${NC}"
  else
    echo -e "  ${RED}❌ Vercel domain might not be allowed${NC}"
    echo -e "  ${YELLOW}   Current allowed: $ALLOWED_ORIGIN${NC}"
  fi
else
  echo -e "  ${RED}❌ No CORS headers found${NC}"
  echo -e "  ${YELLOW}   This will block browser requests from Vercel${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. If backend test passed but frontend fails:"
echo "   → Check browser console for CORS/CSP errors"
echo "   → Verify VITE_API_BASE_URL in Vercel env vars"
echo ""
echo "2. If API returns 401:"
echo "   → Check Supabase user credentials"
echo "   → Verify database has demo users"
echo ""
echo "3. If CORS errors:"
echo "   → Update backend ALLOWED_ORIGINS"
echo "   → Add july25-client.vercel.app to whitelist"
echo ""
echo "=================================="
