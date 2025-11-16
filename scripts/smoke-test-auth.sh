#!/bin/bash

# Smoke Test for Authentication and Order Flow
# This script verifies JWT scope fix and order submission

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="${SERVER_URL:-https://july25-server.onrender.com}"
CLIENT_URL="${CLIENT_URL:-https://july25-client.vercel.app}"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"
PIN="1234"

echo "=========================================="
echo "AUTH & ORDER FLOW SMOKE TEST"
echo "=========================================="
echo "Server: $SERVER_URL"
echo "Client: $CLIENT_URL"
echo ""

# Function to decode JWT
decode_jwt() {
    local token=$1
    echo "$token" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "Failed to decode JWT"
}

# Test 1: Server availability
echo -e "${YELLOW}TEST 1: Server Availability${NC}"
if curl -s -f "$SERVER_URL/api/v1/auth/login" -X POST -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is responding${NC}"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/v1/auth/login" -X POST -H "Content-Type: application/json" -d '{}')
    if [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "401" ]; then
        echo -e "${GREEN}✓ Server is responding (got expected error $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ Server not available (HTTP $HTTP_CODE)${NC}"
        echo "Server may still be deploying. Please wait 2-5 minutes and try again."
        exit 1
    fi
fi

# Test 2: PIN Login
echo -e "\n${YELLOW}TEST 2: PIN Login & JWT Scope Verification${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/auth/pin-login" \
    -H "Content-Type: application/json" \
    -d "{\"pin\":\"$PIN\",\"restaurantId\":\"$RESTAURANT_ID\"}" 2>/dev/null || echo "{}")

if echo "$RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    TOKEN=$(echo "$RESPONSE" | jq -r '.token')
    echo -e "${GREEN}✓ PIN login successful${NC}"

    # Decode and check JWT for scope field
    echo -e "\n${YELLOW}Decoding JWT to check for scope field:${NC}"
    JWT_PAYLOAD=$(decode_jwt "$TOKEN")

    if echo "$JWT_PAYLOAD" | jq -e '.scope' > /dev/null 2>&1; then
        SCOPES=$(echo "$JWT_PAYLOAD" | jq -r '.scope | join(", ")')
        echo -e "${GREEN}✓ JWT contains scope field: [$SCOPES]${NC}"

        # Check for orders:create scope
        if echo "$JWT_PAYLOAD" | jq -e '.scope | contains(["orders:create"])' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ JWT contains 'orders:create' scope${NC}"
        else
            echo -e "${RED}✗ JWT missing 'orders:create' scope${NC}"
        fi
    else
        echo -e "${RED}✗ JWT MISSING scope field - FIX NOT DEPLOYED${NC}"
        echo "JWT Payload:"
        echo "$JWT_PAYLOAD" | jq . || echo "$JWT_PAYLOAD"
    fi
else
    echo -e "${RED}✗ PIN login failed${NC}"
    echo "Response: $RESPONSE"
fi

# Test 3: Order Submission (if we got a token)
if [ ! -z "$TOKEN" ]; then
    echo -e "\n${YELLOW}TEST 3: Order Submission${NC}"

    ORDER_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/orders" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -H "X-Client-Flow: server" \
        -d '{
            "type": "dine-in",
            "items": [{
                "id": "test-item-1",
                "menu_item_id": "550e8400-e29b-41d4-a716-446655440001",
                "name": "Test Item",
                "quantity": 1,
                "price": 10.99
            }],
            "table_number": "1",
            "seat_number": 1,
            "customer_name": "Smoke Test",
            "total_amount": 11.88
        }' -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null)

    HTTP_STATUS=$(echo "$ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')

    if [ "$HTTP_STATUS" == "201" ]; then
        echo -e "${GREEN}✓ Order submission successful (201 Created)${NC}"
    elif [ "$HTTP_STATUS" == "401" ]; then
        ERROR_MSG=$(echo "$BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "$BODY")
        if echo "$ERROR_MSG" | grep -q "Missing required scope"; then
            echo -e "${RED}✗ CRITICAL: 401 'Missing required scope' - JWT scope fix NOT working${NC}"
        else
            echo -e "${RED}✗ 401 Unauthorized: $ERROR_MSG${NC}"
        fi
    elif [ "$HTTP_STATUS" == "400" ]; then
        echo -e "${YELLOW}⚠ 400 Bad Request (may be validation issue, not auth)${NC}"
        echo "Response: $BODY" | jq . 2>/dev/null || echo "$BODY"
    else
        echo -e "${RED}✗ Unexpected response (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $BODY" | jq . 2>/dev/null || echo "$BODY"
    fi
else
    echo -e "\n${YELLOW}Skipping order test (no token)${NC}"
fi

# Test 4: Client availability
echo -e "\n${YELLOW}TEST 4: Client Application${NC}"
CLIENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLIENT_URL")
if [ "$CLIENT_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Client application is accessible${NC}"
else
    echo -e "${RED}✗ Client not accessible (HTTP $CLIENT_STATUS)${NC}"
fi

echo -e "\n=========================================="
echo "SMOKE TEST COMPLETE"
echo "=========================================="

# Summary
echo -e "\n${YELLOW}SUMMARY:${NC}"
echo "• Server Status: $([ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "401" ] && echo "✓ Available" || echo "✗ Not Available")"
echo "• JWT Scope Fix: $(echo "$JWT_PAYLOAD" | jq -e '.scope' > /dev/null 2>&1 && echo "✓ Deployed" || echo "✗ Not Deployed")"
echo "• Order Creation: $([ "$HTTP_STATUS" == "201" ] && echo "✓ Working" || echo "✗ Check needed")"
echo "• Client App: $([ "$CLIENT_STATUS" == "200" ] && echo "✓ Available" || echo "✗ Not Available")"

# Exit with appropriate code
if echo "$JWT_PAYLOAD" | jq -e '.scope' > /dev/null 2>&1; then
    exit 0
else
    exit 1
fi