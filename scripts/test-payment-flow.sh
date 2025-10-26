#!/bin/bash
# Test complete payment flow in production
# Diagnose the 500 error

set -e

BASE_URL="https://july25.onrender.com"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "🧪 Payment Flow Diagnostic Test"
echo "================================"
echo ""

# Step 1: Create demo session
echo "1️⃣ Creating demo session..."
DEMO_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/demo-session" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"server\", \"restaurantId\": \"${RESTAURANT_ID}\"}")

TOKEN=$(echo "$DEMO_RESP" | jq -r '.token')
USER_ID=$(echo "$DEMO_RESP" | jq -r '.user.id')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to create demo session"
  echo "$DEMO_RESP"
  exit 1
fi

echo "✅ Demo session created"
echo "   User ID: $USER_ID"
echo ""

# Step 2: Create order
echo "2️⃣ Creating order..."
ORDER_RESP=$(curl -s -X POST "$BASE_URL/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-restaurant-id: $RESTAURANT_ID" \
  -d '{
    "items": [{
      "menuItemId": "512c2255-5565-4380-9377-c1cd79270157",
      "quantity": 1,
      "name": "Test Burger",
      "price": 10.00
    }],
    "orderType": "dine_in",
    "source": "server",
    "tableId": "00000000-0000-0000-0000-000000000001"
  }')

ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.id // .orderId // empty')
ORDER_TOTAL=$(echo "$ORDER_RESP" | jq -r '.total // empty')

if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" = "null" ]; then
  echo "❌ Failed to create order"
  echo "$ORDER_RESP" | jq '.' 2>/dev/null || echo "$ORDER_RESP"
  exit 1
fi

echo "✅ Order created"
echo "   Order ID: $ORDER_ID"
echo "   Total: \$$ORDER_TOTAL"
echo ""

# Step 3: Attempt payment
echo "3️⃣ Attempting payment..."
echo "   Testing with Square test card nonce..."
PAYMENT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/payments/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-restaurant-id: $RESTAURANT_ID" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"token\": \"cnon:card-nonce-ok\",
    \"amount\": $ORDER_TOTAL,
    \"idempotency_key\": \"test-$(date +%s)\"
  }")

PAYMENT_HTTP=$(echo "$PAYMENT_RESP" | tail -n1)
PAYMENT_BODY=$(echo "$PAYMENT_RESP" | sed '$d')

echo "   HTTP Status: $PAYMENT_HTTP"
echo ""

# Analyze result
if [ "$PAYMENT_HTTP" = "200" ] || [ "$PAYMENT_HTTP" = "201" ]; then
  echo "✅ PAYMENT SUCCESSFUL!"
  echo "$PAYMENT_BODY" | jq '.'
  echo ""
  echo "🎉 Payment flow is WORKING - no blocker!"
  exit 0

elif [ "$PAYMENT_HTTP" = "400" ]; then
  echo "⚠️  Payment validation error (not RBAC)"
  echo "$PAYMENT_BODY" | jq '.'
  echo ""
  echo "📋 This may be:"
  echo "   - Invalid Square API key/configuration"
  echo "   - Test nonce not accepted in production"
  echo "   - Order state issue"

elif [ "$PAYMENT_HTTP" = "500" ]; then
  echo "❌ INTERNAL SERVER ERROR"
  echo "$PAYMENT_BODY" | jq '.'
  echo ""
  echo "🔍 DIAGNOSIS NEEDED:"
  echo "   1. Check Render logs for stack trace"
  echo "   2. Verify Square API credentials in Render env vars"
  echo "   3. Check if Square sandbox vs production mode"
  echo "   4. Verify order is in correct state for payment"
  echo ""
  echo "🚨 This is a BLOCKER - needs immediate investigation"

elif [ "$PAYMENT_HTTP" = "403" ]; then
  echo "❌ RBAC STILL BLOCKING (unexpected!)"
  echo "$PAYMENT_BODY" | jq '.'
  echo ""
  echo "🚨 CRITICAL: RBAC fix didn't work!"

else
  echo "⚠️  Unexpected response: HTTP $PAYMENT_HTTP"
  echo "$PAYMENT_BODY" | jq '.' 2>/dev/null || echo "$PAYMENT_BODY"
fi

echo ""
echo "================================"
echo "Summary:"
echo "  Auth: ✅ Working"
echo "  Orders: ✅ Working"
echo "  Payments: HTTP $PAYMENT_HTTP"
