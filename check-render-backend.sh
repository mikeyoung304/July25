#!/bin/bash

# Production Voice Ordering Backend Diagnostic
# Tests july25.onrender.com for OpenAI Realtime API issues

BASE_URL="https://july25.onrender.com"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "================================================================"
echo "🔧 Voice Ordering Backend Diagnostics - july25.onrender.com"
echo "================================================================"
echo ""

# Test 1: General Health
echo "📋 Test 1: General Backend Health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HEALTH_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Backend is online${NC}"
  echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
else
  echo -e "${RED}❌ Backend health check failed: HTTP $HEALTH_CODE${NC}"
  echo "$HEALTH_BODY"
fi
echo ""

# Test 2: Realtime Service Health
echo "📋 Test 2: Realtime Service Health (OpenAI API Key)"
RT_HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/realtime/health")
RT_CODE=$(echo "$RT_HEALTH" | tail -n1)
RT_BODY=$(echo "$RT_HEALTH" | head -n-1)

if [ "$RT_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Realtime service is healthy${NC}"
  echo "$RT_BODY" | jq '.' 2>/dev/null || echo "$RT_BODY"
else
  echo -e "${RED}❌ Realtime service unhealthy: HTTP $RT_CODE${NC}"
  echo "$RT_BODY" | jq '.' 2>/dev/null || echo "$RT_BODY"
  
  # Check for specific issues
  if echo "$RT_BODY" | grep -q '"api_key":false'; then
    echo -e "${RED}→ OPENAI_API_KEY is not configured in Render${NC}"
  fi
  if echo "$RT_BODY" | grep -q '"api_key_valid":false'; then
    echo -e "${RED}→ OPENAI_API_KEY contains invalid characters (newlines?)${NC}"
  fi
fi
echo ""

# Test 3: Menu Loading
echo "📋 Test 3: Menu Loading"
MENU_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
  "${BASE_URL}/api/v1/menu")
MENU_CODE=$(echo "$MENU_RESPONSE" | tail -n1)
MENU_BODY=$(echo "$MENU_RESPONSE" | head -n-1)

if [ "$MENU_CODE" = "200" ]; then
  ITEM_COUNT=$(echo "$MENU_BODY" | jq '.items | length' 2>/dev/null || echo "0")
  CAT_COUNT=$(echo "$MENU_BODY" | jq '.categories | length' 2>/dev/null || echo "0")
  
  if [ "$ITEM_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✅ Menu loaded: $ITEM_COUNT items, $CAT_COUNT categories${NC}"
  else
    echo -e "${YELLOW}⚠️  Menu loaded but empty (no items)${NC}"
  fi
else
  echo -e "${RED}❌ Menu loading failed: HTTP $MENU_CODE${NC}"
  echo "$MENU_BODY" | jq '.' 2>/dev/null || echo "$MENU_BODY"
fi
echo ""

# Test 4: Menu Health Check
echo "📋 Test 4: Menu Health Check"
MENU_HEALTH=$(curl -s -w "\n%{http_code}" \
  "${BASE_URL}/api/v1/realtime/menu-check/${RESTAURANT_ID}")
MH_CODE=$(echo "$MENU_HEALTH" | tail -n1)
MH_BODY=$(echo "$MENU_HEALTH" | head -n-1)

if [ "$MH_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Menu health check passed${NC}"
  echo "$MH_BODY" | jq '.' 2>/dev/null || echo "$MH_BODY"
else
  echo -e "${RED}❌ Menu health check failed: HTTP $MH_CODE${NC}"
  echo "$MH_BODY" | jq '.' 2>/dev/null || echo "$MH_BODY"
fi
echo ""

# Test 5: Ephemeral Token Creation (Critical Test)
echo "📋 Test 5: Ephemeral Token Creation"
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
  "${BASE_URL}/api/v1/realtime/session")
SESSION_CODE=$(echo "$SESSION_RESPONSE" | tail -n1)
SESSION_BODY=$(echo "$SESSION_RESPONSE" | head -n-1)

if [ "$SESSION_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Ephemeral token created successfully${NC}"
  
  SESSION_ID=$(echo "$SESSION_BODY" | jq -r '.id // "N/A"')
  MENU_CTX_LEN=$(echo "$SESSION_BODY" | jq -r '.menu_context | length // 0')
  EXPIRES_AT=$(echo "$SESSION_BODY" | jq -r '.expires_at // "N/A"')
  
  echo "   Session ID: $SESSION_ID"
  echo "   Expires: $EXPIRES_AT"
  echo "   Menu context: $MENU_CTX_LEN characters"
  
  if [ "$MENU_CTX_LEN" -gt "100" ]; then
    echo -e "${GREEN}   ✅ Menu context included (AI will know the menu)${NC}"
    echo ""
    echo "   Menu preview:"
    echo "$SESSION_BODY" | jq -r '.menu_context' | head -n 10
  else
    echo -e "${YELLOW}   ⚠️  Menu context is empty or too small${NC}"
  fi
else
  echo -e "${RED}❌ Session creation failed: HTTP $SESSION_CODE${NC}"
  echo "$SESSION_BODY" | jq '.' 2>/dev/null || echo "$SESSION_BODY"
  
  # Check for specific errors
  if echo "$SESSION_BODY" | grep -q "not configured"; then
    echo -e "${RED}→ Fix: Set OPENAI_API_KEY in Render environment${NC}"
  fi
  if echo "$SESSION_BODY" | grep -q "invalid characters"; then
    echo -e "${RED}→ Fix: Use 'echo -n' when setting OPENAI_API_KEY${NC}"
  fi
  if echo "$SESSION_BODY" | grep -q "MENU_LOAD_FAILED"; then
    echo -e "${RED}→ Fix: Menu data missing. Run: npm run db:seed${NC}"
  fi
fi
echo ""

# Test 6: CORS
echo "📋 Test 6: CORS Configuration"
CORS_HEADERS=$(curl -s -I -X OPTIONS \
  -H "Origin: https://july25-client.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Restaurant-ID,Content-Type" \
  "${BASE_URL}/api/v1/realtime/session" | grep -i "access-control")

if [ ! -z "$CORS_HEADERS" ]; then
  echo -e "${GREEN}✅ CORS configured${NC}"
  echo "$CORS_HEADERS"
else
  echo -e "${RED}❌ CORS not configured or blocked${NC}"
  echo -e "${RED}→ Fix: Add https://july25-client.vercel.app to ALLOWED_ORIGINS${NC}"
fi
echo ""

# Summary
echo "================================================================"
echo "📊 Summary"
echo "================================================================"

CHECKS=0
PASSED=0

check() {
  CHECKS=$((CHECKS + 1))
  if [ "$1" = "1" ]; then
    echo -e "${GREEN}✅ $2${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ $2${NC}"
  fi
}

check $([ "$HEALTH_CODE" = "200" ] && echo "1" || echo "0") "Backend online"
check $([ "$RT_CODE" = "200" ] && echo "1" || echo "0") "Realtime service healthy"
check $([ "$MENU_CODE" = "200" ] && echo "1" || echo "0") "Menu loading works"
check $([ "$SESSION_CODE" = "200" ] && echo "1" || echo "0") "Ephemeral token creation"
check $([ "$MENU_CTX_LEN" -gt "100" ] && echo "1" || echo "0") "Menu context included"
check $([ ! -z "$CORS_HEADERS" ] && echo "1" || echo "0") "CORS configured"

echo ""
echo "Result: $PASSED/$CHECKS checks passed"
echo ""

if [ "$PASSED" -eq "$CHECKS" ]; then
  echo -e "${GREEN}🎉 All systems operational!${NC}"
else
  echo -e "${YELLOW}⚠️  $((CHECKS - PASSED)) issue(s) found. Check errors above.${NC}"
fi

echo "================================================================"
echo ""
