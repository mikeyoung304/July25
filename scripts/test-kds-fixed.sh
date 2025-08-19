#!/bin/bash

# Test KDS with fixed WebSocket connection
echo "🧪 Testing Kitchen Display System WebSocket Fix"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3001/api/v1"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo -e "\n${YELLOW}Step 1: Get demo token${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/kiosk" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\": \"$RESTAURANT_ID\"}")

if [ $? -ne 0 ] || [ -z "$TOKEN_RESPONSE" ]; then
    echo -e "${RED}❌ Failed to get demo token${NC}"
    echo "Response: $TOKEN_RESPONSE"
    
    # Try with header instead
    echo -e "\n${YELLOW}Trying with X-Restaurant-ID header...${NC}"
    TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/kiosk" \
      -H "Content-Type: application/json" \
      -H "X-Restaurant-ID: $RESTAURANT_ID")
fi

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Could not extract token${NC}"
    echo "Full response: $TOKEN_RESPONSE"
    echo -e "\n${YELLOW}Using test-token fallback for development${NC}"
    TOKEN="test-token"
fi

echo -e "${GREEN}✅ Using token: ${TOKEN:0:20}...${NC}"

echo -e "\n${YELLOW}Step 2: Create test order via API${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$API_BASE/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -d '{
    "type": "online",
    "items": [{
      "id": "fix-test-'$(date +%s)'",
      "menu_item_id": "fix-test-'$(date +%s)'",
      "name": "WebSocket Fix Test - '$(date +%H:%M:%S)'",
      "price": 19.99,
      "quantity": 1,
      "modifiers": []
    }],
    "customer_name": "KDS Fix Test"
  }')

echo "API Response: $ORDER_RESPONSE"

# Check if order was created
if echo "$ORDER_RESPONSE" | grep -q '"id"'; then
    ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    ORDER_NUMBER=$(echo "$ORDER_RESPONSE" | grep -o '"orderNumber":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Order created successfully!${NC}"
    echo "   Order ID: $ORDER_ID"
    echo "   Order Number: $ORDER_NUMBER"
    echo ""
    echo -e "${GREEN}🎉 NOW CHECK THE KITCHEN DISPLAY!${NC}"
    echo "   1. Open http://localhost:5173/kitchen"
    echo "   2. Check browser console for diagnostic logs"
    echo "   3. Order should appear immediately in the UI"
    echo ""
    echo "Expected console output:"
    echo "  - [WebSocket] Raw message received: order:created"
    echo "  - [EventEmitter] Emitting 'message'"
    echo "  - [WebSocket] Subscription handler checking"
    echo "  - [OrderUpdates] Raw order:created payload"
else
    echo -e "${RED}❌ Failed to create order${NC}"
    echo "Response: $ORDER_RESPONSE"
fi

echo -e "\n${YELLOW}Step 3: Check WebSocket connections${NC}"
echo "Active WebSocket connections:"
lsof -i:3001 | grep -E "ESTABLISHED.*WebSocket" | wc -l | xargs echo "  Count:"

echo -e "\n${GREEN}Test complete!${NC}"