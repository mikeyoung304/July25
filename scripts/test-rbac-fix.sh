#!/bin/bash
# Test script to verify RBAC fix for demo users
# Tests the payment flow that was previously failing

set -e

BASE_URL="http://localhost:3001"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "🧪 Testing RBAC Fix for Demo Users"
echo "=================================="
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
  if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
    echo "✅ Server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server failed to start"
    exit 1
  fi
  sleep 1
done
echo ""

# Step 1: Create demo session (server role)
echo "1️⃣  Creating demo session (server role)..."
DEMO_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/demo-session" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"server\", \"restaurantId\": \"${RESTAURANT_ID}\"}")

TOKEN=$(echo $DEMO_RESPONSE | jq -r '.token')
USER_ID=$(echo $DEMO_RESPONSE | jq -r '.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to create demo session"
  echo "Response: $DEMO_RESPONSE"
  exit 1
fi

echo "✅ Demo session created"
echo "   User ID: $USER_ID"
echo ""

# Step 2: Create an order
echo "2️⃣  Creating test order..."
ORDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-restaurant-id: ${RESTAURANT_ID}" \
  -d '{
    "items": [
      {
        "menuItemId": "512c2255-5565-4380-9377-c1cd79270157",
        "quantity": 1,
        "name": "Test Item",
        "price": 10.00
      }
    ],
    "orderType": "dine_in",
    "source": "server"
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id // .orderId')

if [ "$ORDER_ID" = "null" ] || [ -z "$ORDER_ID" ]; then
  echo "❌ Failed to create order"
  echo "Response: $ORDER_RESPONSE"
  exit 1
fi

echo "✅ Order created"
echo "   Order ID: $ORDER_ID"
echo ""

# Step 3: Test payment creation (THIS WAS FAILING BEFORE)
echo "3️⃣  Testing payment creation (previously failing)..."
PAYMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/payments/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-restaurant-id: ${RESTAURANT_ID}" \
  -d "{
    \"order_id\": \"${ORDER_ID}\",
    \"token\": \"cnon:card-nonce-ok\",
    \"amount\": 10.00,
    \"idempotency_key\": \"test-$(date +%s)\"
  }")

HTTP_CODE=$(echo "$PAYMENT_RESPONSE" | tail -n1)
PAYMENT_BODY=$(echo "$PAYMENT_RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "403" ]; then
  echo "❌ Payment creation failed with 403 Forbidden"
  echo "   Error: $PAYMENT_BODY"
  echo ""
  echo "🚨 RBAC FIX DID NOT WORK - Demo users still blocked from payments"
  exit 1
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Payment creation failed with 401 Unauthorized"
  echo "   Error: $PAYMENT_BODY"
  exit 1
elif [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "✅ Payment creation succeeded!"
  echo ""
  echo "🎉 RBAC FIX VERIFIED - Demo users can now create payments"
  exit 0
else
  echo "⚠️  Unexpected status code: $HTTP_CODE"
  echo "   Response: $PAYMENT_BODY"
  exit 1
fi
