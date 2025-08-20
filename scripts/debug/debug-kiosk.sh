#!/bin/bash

# Comprehensive Kiosk Debugging Script
# Tests all components of the voice ordering system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://july25.onrender.com"
CLIENT_URL="https://july25-client.vercel.app"
CLIENT_PREVIEW="https://july25-client-git-feat-r-b7c846-mikeyoung304-gmailcoms-projects.vercel.app"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "🔍 Kiosk System Diagnostic Test"
echo "================================"
echo ""

# Test 1: API Health
echo "1. Testing API Health..."
if curl -s "${API_URL}/api/v1/health" | grep -q "healthy"; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}✗ API is not healthy${NC}"
    curl -s "${API_URL}/api/v1/health" | jq '.' || echo "Failed to get health status"
fi
echo ""

# Test 2: CORS Headers
echo "2. Testing CORS Configuration..."
CORS_TEST=$(curl -s -I -X OPTIONS \
    -H "Origin: ${CLIENT_URL}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: X-Restaurant-ID" \
    "${API_URL}/api/v1/menu/categories" 2>/dev/null)

if echo "$CORS_TEST" | grep -q "access-control-allow-origin: ${CLIENT_URL}"; then
    echo -e "${GREEN}✓ CORS allows main client URL${NC}"
else
    echo -e "${RED}✗ CORS blocking main client URL${NC}"
    echo "$CORS_TEST" | grep -i "access-control" || echo "No CORS headers found"
fi

# Test preview URL CORS
CORS_PREVIEW=$(curl -s -I -X OPTIONS \
    -H "Origin: ${CLIENT_PREVIEW}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: X-Restaurant-ID" \
    "${API_URL}/api/v1/menu/categories" 2>/dev/null)

if echo "$CORS_PREVIEW" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✓ CORS allows preview URLs${NC}"
else
    echo -e "${RED}✗ CORS blocking preview URLs${NC}"
fi
echo ""

# Test 3: Demo Authentication
echo "3. Testing Demo Authentication..."
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/kiosk" \
    -H "Content-Type: application/json" \
    -d "{\"restaurantId\": \"${RESTAURANT_ID}\"}")

if echo "$AUTH_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    DEMO_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
    echo -e "${GREEN}✓ Demo auth working, token received${NC}"
    echo "   Token prefix: ${DEMO_TOKEN:0:20}..."
else
    echo -e "${RED}✗ Demo auth failed${NC}"
    echo "$AUTH_RESPONSE" | jq '.' || echo "$AUTH_RESPONSE"
fi
echo ""

# Test 4: Menu Access (No Auth)
echo "4. Testing Menu Access (No Auth)..."
MENU_NOAUTH=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
    "${API_URL}/api/v1/menu/categories")

HTTP_STATUS=$(echo "$MENU_NOAUTH" | grep "HTTP_STATUS" | cut -d: -f2)
MENU_DATA=$(echo "$MENU_NOAUTH" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" = "200" ]; then
    CATEGORY_COUNT=$(echo "$MENU_DATA" | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Menu categories accessible without auth (${CATEGORY_COUNT} categories)${NC}"
else
    echo -e "${RED}✗ Menu categories not accessible (HTTP ${HTTP_STATUS})${NC}"
    echo "$MENU_DATA" | jq '.' || echo "$MENU_DATA"
fi
echo ""

# Test 5: Menu Items
echo "5. Testing Menu Items..."
ITEMS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
    "${API_URL}/api/v1/menu/items")

ITEMS_STATUS=$(echo "$ITEMS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
ITEMS_DATA=$(echo "$ITEMS_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$ITEMS_STATUS" = "200" ]; then
    ITEM_COUNT=$(echo "$ITEMS_DATA" | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Menu items accessible (${ITEM_COUNT} items)${NC}"
    echo "$ITEMS_DATA" | jq '.[0:2] | .[] | {name, price}' 2>/dev/null || echo ""
else
    echo -e "${RED}✗ Menu items not accessible (HTTP ${ITEMS_STATUS})${NC}"
fi
echo ""

# Test 6: Chat Endpoint with Token
echo "6. Testing Chat Endpoint..."
if [ ! -z "${DEMO_TOKEN:-}" ]; then
    CHAT_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/ai/chat" \
        -H "Authorization: Bearer ${DEMO_TOKEN}" \
        -H "Content-Type: application/json" \
        -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
        -d '{"message": "What sandwiches do you have?"}')
    
    if echo "$CHAT_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Chat endpoint working${NC}"
        echo "   Response: $(echo "$CHAT_RESPONSE" | jq -r '.message' | head -1)"
    else
        echo -e "${RED}✗ Chat endpoint failed${NC}"
        echo "$CHAT_RESPONSE" | jq '.' || echo "$CHAT_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠ Skipping (no token)${NC}"
fi
echo ""

# Test 7: Voice Endpoints
echo "7. Testing Voice Endpoints..."
echo "   Checking /api/v1/ai/test-tts..."
TTS_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${API_URL}/api/v1/ai/test-tts" \
    -H "Content-Type: application/json" \
    -d '{"text": "Test"}' \
    -o /tmp/tts-test.mp3)

TTS_STATUS=$(echo "$TTS_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$TTS_STATUS" = "200" ] && [ -s /tmp/tts-test.mp3 ]; then
    FILE_SIZE=$(ls -lh /tmp/tts-test.mp3 | awk '{print $5}')
    echo -e "${GREEN}✓ TTS endpoint working (${FILE_SIZE} audio)${NC}"
else
    echo -e "${RED}✗ TTS endpoint failed (HTTP ${TTS_STATUS})${NC}"
fi
echo ""

# Test 8: Client Build Check
echo "8. Checking Client Build..."
CLIENT_HTML=$(curl -s "${CLIENT_URL}" | head -20)
if echo "$CLIENT_HTML" | grep -q "root"; then
    echo -e "${GREEN}✓ Client is deployed and responding${NC}"
    
    # Check for API URL in client
    echo "   Checking client's API configuration..."
    CLIENT_JS=$(curl -s "${CLIENT_URL}/assets/index-*.js" 2>/dev/null | head -1000)
    if echo "$CLIENT_JS" | grep -q "july25.onrender.com"; then
        echo -e "${GREEN}   ✓ Client has correct API URL${NC}"
    else
        echo -e "${YELLOW}   ⚠ Cannot verify client API URL${NC}"
    fi
else
    echo -e "${RED}✗ Client not responding properly${NC}"
fi
echo ""

# Test 9: Browser-like Request
echo "9. Testing Browser-like Request..."
BROWSER_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Origin: ${CLIENT_URL}" \
    -H "Referer: ${CLIENT_URL}/kiosk" \
    -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
    -H "Accept: application/json" \
    -H "User-Agent: Mozilla/5.0" \
    "${API_URL}/api/v1/menu/categories")

BROWSER_STATUS=$(echo "$BROWSER_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$BROWSER_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Browser-like request successful${NC}"
else
    echo -e "${RED}✗ Browser-like request failed (HTTP ${BROWSER_STATUS})${NC}"
    echo "$BROWSER_TEST" | grep -v "HTTP_STATUS" | jq '.' || echo ""
fi
echo ""

# Summary
echo "================================"
echo "Summary:"
echo "--------------------------------"
echo "API URL: ${API_URL}"
echo "Client URL: ${CLIENT_URL}"
echo "Restaurant ID: ${RESTAURANT_ID}"
echo ""

# Recommendations
echo "Debugging Steps:"
echo "1. If CORS failing: Check server logs for exact origin being blocked"
echo "2. If Auth failing: Check /api/v1/auth/kiosk endpoint exists"
echo "3. If Menu failing: Check restaurant ID and database connection"
echo "4. If Client failing: Check Vercel deployment and build logs"
echo ""
echo "To see browser errors:"
echo "1. Open ${CLIENT_URL}/kiosk"
echo "2. Open DevTools (F12)"
echo "3. Check Console and Network tabs"
echo "4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"