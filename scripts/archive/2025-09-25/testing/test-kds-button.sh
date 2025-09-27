#!/bin/bash

# Test script to verify KDS button functionality
echo "🧪 Testing Kitchen Display Order Creation"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "\n${YELLOW}1. Checking server health...${NC}"
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
    echo "  Response: $(echo $HEALTH | jq -c .)"
else
    echo -e "${RED}✗ Server is not running on port 3001${NC}"
    echo "  Please run: npm run dev:server"
    exit 1
fi

# Get demo token
echo -e "\n${YELLOW}2. Getting demo authentication token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/kiosk \
    -H "Content-Type: application/json" \
    -d '{"restaurantId":"11111111-1111-1111-1111-111111111111"}' 2>/dev/null)

if [ $? -eq 0 ]; then
    TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✓ Demo token obtained${NC}"
        echo "  Token (first 50 chars): ${TOKEN:0:50}..."
    else
        echo -e "${RED}✗ Failed to get demo token${NC}"
        echo "  Response: $TOKEN_RESPONSE"
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to connect to auth endpoint${NC}"
    exit 1
fi

# Create test order (same structure as button)
echo -e "\n${YELLOW}3. Creating test order (simulating button click)...${NC}"
ORDER_DATA='{
  "customer_name": "Test Customer 123",
  "type": "online",
  "items": [{
    "id": "item-test-123",
    "menu_item_id": "item-test-123",
    "name": "Test Burger",
    "quantity": 1,
    "price": 15.99,
    "modifiers": []
  }],
  "subtotal": 15.99,
  "tax": 1.28,
  "total": 17.27
}'

ORDER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/orders \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
    -H "Content-Type: application/json" \
    -d "$ORDER_DATA" 2>/dev/null)

if [ $? -eq 0 ]; then
    ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id')
    if [ "$ORDER_ID" != "null" ] && [ -n "$ORDER_ID" ]; then
        echo -e "${GREEN}✓ Order created successfully${NC}"
        echo "  Order ID: $ORDER_ID"
        echo "  Order Number: $(echo $ORDER_RESPONSE | jq -r '.orderNumber')"
    else
        echo -e "${RED}✗ Order creation failed${NC}"
        echo "  Response: $ORDER_RESPONSE"
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to connect to orders endpoint${NC}"
    exit 1
fi

# Check WebSocket broadcast logs
echo -e "\n${YELLOW}4. Checking for WebSocket broadcast...${NC}"
echo "  (Check server logs for broadcast messages)"

# Get orders to verify it appears
echo -e "\n${YELLOW}5. Fetching orders to verify creation...${NC}"
ORDERS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/v1/orders \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" 2>/dev/null)

if [ $? -eq 0 ]; then
    ORDER_COUNT=$(echo $ORDERS_RESPONSE | jq '. | length')
    FOUND_ORDER=$(echo $ORDERS_RESPONSE | jq --arg id "$ORDER_ID" '.[] | select(.id == $id)')
    
    if [ -n "$FOUND_ORDER" ]; then
        echo -e "${GREEN}✓ Order found in list (Total orders: $ORDER_COUNT)${NC}"
    else
        echo -e "${RED}✗ Order not found in list${NC}"
    fi
else
    echo -e "${RED}✗ Failed to fetch orders${NC}"
fi

echo -e "\n========================================="
echo -e "${GREEN}✅ Backend test complete!${NC}"
echo ""
echo "📝 To test the UI button:"
echo "  1. Open http://localhost:5173/kitchen"
echo "  2. Open browser console (F12)"
echo "  3. Click 'Create Test Order' button"
echo "  4. Check console for these logs:"
echo "     - [KitchenDisplay] Create Test Order button clicked"
echo "     - [KitchenDisplay] Prepared mock order: ..."
echo "     - [OrderService] submitOrder called with: ..."
echo "     - [OrderService] Validating order: ..."
echo ""
echo "If you see these logs but no order is created, the issue is in validation."
echo "If you don't see these logs, the button click handler isn't being triggered."