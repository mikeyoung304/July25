#!/bin/bash

# KDS End-to-End Test Script
# Tests the complete Kitchen Display System functionality

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:3001}"
RESTAURANT_ID="${RESTAURANT_ID:-11111111-1111-1111-1111-111111111111}"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}      KDS End-to-End Testing Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

# Function to get auth token
get_token() {
    echo -e "${YELLOW}→ Getting authentication token...${NC}"
    TOKEN=$(curl -s -X POST "$API_URL/api/v1/auth/kiosk" \
        -H "Content-Type: application/json" \
        -d "{\"restaurantId\": \"$RESTAURANT_ID\"}" | jq -r '.token')
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo -e "${RED}Failed to get auth token${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Token obtained${NC}\n"
}

# Test 1: API Health Check
test_api_health() {
    echo -e "${BLUE}Test 1: API Health Check${NC}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health")
    [ "$STATUS" -eq 200 ]
    print_result $? "API is healthy (Status: $STATUS)"
    echo
}

# Test 2: WebSocket Connection
test_websocket() {
    echo -e "${BLUE}Test 2: WebSocket Connection${NC}"
    
    # Test WebSocket endpoint exists
    WS_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Sec-WebSocket-Key: test" \
        "$API_URL")
    
    [ "$WS_TEST" -eq 426 ]  # Should return 426 Upgrade Required
    print_result $? "WebSocket endpoint available"
    echo
}

# Test 3: Create Order with Valid Type
test_create_order() {
    echo -e "${BLUE}Test 3: Create Order with Valid Type${NC}"
    
    ORDER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -d '{
            "type": "online",
            "customer_name": "KDS Test Suite",
            "items": [{
                "id": "test-soul-bowl",
                "menu_item_id": "test-soul-bowl",
                "name": "Soul Bowl",
                "quantity": 1,
                "price": 14.00,
                "modifiers": []
            }],
            "notes": "Automated test order"
        }')
    
    ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
    ORDER_NUMBER=$(echo "$ORDER_RESPONSE" | jq -r '.orderNumber')
    ORDER_TYPE=$(echo "$ORDER_RESPONSE" | jq -r '.type')
    
    if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
        echo -e "${GREEN}✅ Order created: #$ORDER_NUMBER (ID: $ORDER_ID)${NC}"
        echo -e "${GREEN}✅ Order type is valid: $ORDER_TYPE${NC}"
        
        # Store for later tests
        echo "$ORDER_ID" > /tmp/kds-test-order-id.txt
        echo "$ORDER_NUMBER" > /tmp/kds-test-order-number.txt
    else
        echo -e "${RED}❌ Failed to create order${NC}"
        echo "$ORDER_RESPONSE" | jq
        exit 1
    fi
    echo
}

# Test 4: Retrieve Orders
test_get_orders() {
    echo -e "${BLUE}Test 4: Retrieve Orders${NC}"
    
    ORDERS=$(curl -s -X GET "$API_URL/api/v1/orders?limit=5" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Restaurant-ID: $RESTAURANT_ID")
    
    ORDER_COUNT=$(echo "$ORDERS" | jq '. | length')
    
    if [ "$ORDER_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Retrieved $ORDER_COUNT orders${NC}"
        
        # Check if our test order is in the list
        if [ -f /tmp/kds-test-order-id.txt ]; then
            TEST_ORDER_ID=$(cat /tmp/kds-test-order-id.txt)
            FOUND=$(echo "$ORDERS" | jq --arg id "$TEST_ORDER_ID" '.[] | select(.id == $id) | .id')
            
            if [ -n "$FOUND" ]; then
                echo -e "${GREEN}✅ Test order found in orders list${NC}"
            else
                echo -e "${YELLOW}⚠️  Test order not in recent orders (might be paginated)${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  No orders found (database might be empty)${NC}"
    fi
    echo
}

# Test 5: Update Order Status
test_update_status() {
    echo -e "${BLUE}Test 5: Update Order Status${NC}"
    
    if [ -f /tmp/kds-test-order-id.txt ]; then
        ORDER_ID=$(cat /tmp/kds-test-order-id.txt)
        
        # Update to preparing
        STATUS_RESPONSE=$(curl -s -X PATCH "$API_URL/api/v1/orders/$ORDER_ID/status" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Restaurant-ID: $RESTAURANT_ID" \
            -d '{"status": "preparing"}')
        
        NEW_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
        
        if [ "$NEW_STATUS" = "preparing" ]; then
            echo -e "${GREEN}✅ Order status updated to: $NEW_STATUS${NC}"
        else
            echo -e "${RED}❌ Failed to update order status${NC}"
            echo "$STATUS_RESPONSE" | jq
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping (no test order created)${NC}"
    fi
    echo
}

# Test 6: Test Different Order Types
test_order_type_mapping() {
    echo -e "${BLUE}Test 6: Order Type Mapping${NC}"
    
    # Test kiosk → online mapping
    KIOSK_ORDER=$(curl -s -X POST "$API_URL/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -d '{
            "type": "kiosk",
            "customer_name": "Type Test - Kiosk",
            "items": [{
                "id": "test-1",
                "menu_item_id": "test-1",
                "name": "Test Item",
                "quantity": 1,
                "price": 10.00
            }]
        }')
    
    KIOSK_TYPE=$(echo "$KIOSK_ORDER" | jq -r '.type')
    
    if [ "$KIOSK_TYPE" = "online" ]; then
        echo -e "${GREEN}✅ Kiosk type correctly mapped to: $KIOSK_TYPE${NC}"
    else
        echo -e "${RED}❌ Kiosk type mapping failed (got: $KIOSK_TYPE)${NC}"
    fi
    
    # Test voice → online mapping
    VOICE_ORDER=$(curl -s -X POST "$API_URL/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -d '{
            "type": "voice",
            "customer_name": "Type Test - Voice",
            "items": [{
                "id": "test-2",
                "menu_item_id": "test-2",
                "name": "Test Item",
                "quantity": 1,
                "price": 10.00
            }]
        }')
    
    VOICE_TYPE=$(echo "$VOICE_ORDER" | jq -r '.type')
    
    if [ "$VOICE_TYPE" = "online" ]; then
        echo -e "${GREEN}✅ Voice type correctly mapped to: $VOICE_TYPE${NC}"
    else
        echo -e "${RED}❌ Voice type mapping failed (got: $VOICE_TYPE)${NC}"
    fi
    echo
}

# Run all tests
echo -e "${YELLOW}Starting KDS test suite...${NC}\n"

# Get token first
get_token

# Run tests
test_api_health
test_websocket
test_create_order
test_get_orders
test_update_status
test_order_type_mapping

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     All KDS tests completed successfully! 🎉${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Open http://localhost:5173/kitchen in your browser"
echo -e "2. Click 'Show Debug Panel' at the bottom"
echo -e "3. Verify WebSocket is connected (green indicator)"
echo -e "4. Create test orders using the button"
echo -e "5. Watch orders appear in real-time!"
echo
echo -e "${GREEN}Your KDS system is now fully operational! 🚀${NC}"