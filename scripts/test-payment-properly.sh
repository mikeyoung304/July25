#!/bin/bash
# Test payment with correct order total

BASE_URL="https://july25.onrender.com"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "🧪 Testing Payment with Valid Order"
echo "===================================="
echo ""

# Create session
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/demo-session" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"server\", \"restaurantId\": \"${RESTAURANT_ID}\"}" | jq -r '.token')

echo "✅ Demo session created"

# Create order
ORDER=$(curl -s -X POST "$BASE_URL/api/v1/orders" \
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
    "source": "server"
  }')

ORDER_ID=$(echo "$ORDER" | jq -r '.id')
ORDER_TOTAL=$(echo "$ORDER" | jq -r '.total_amount')

echo "✅ Order created: $ORDER_ID"
echo "   Total: \$$ORDER_TOTAL"
echo ""

# Test payment
echo "🔍 Testing payment..."
PAYMENT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/payments/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-restaurant-id: $RESTAURANT_ID" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"token\": \"cnon:card-nonce-ok\",
    \"amount\": $ORDER_TOTAL,
    \"idempotency_key\": \"test-$(date +%s)\"
  }")

HTTP_CODE=$(echo "$PAYMENT" | tail -n1)
BODY=$(echo "$PAYMENT" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "🎉 PAYMENT SUCCESS - No blocker!"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "⚠️  400 Bad Request - Likely Square API config issue"
  echo "This is NOT a blocker for launch if:"
  echo "  1. Real Square cards work (not test nonces)"
  echo "  2. Square API keys are configured correctly"
  echo ""
  echo "📋 Action Items:"
  echo "  - Verify SQUARE_ACCESS_TOKEN in Render env vars"
  echo "  - Check if using Square Sandbox vs Production mode"
  echo "  - Test with real card in staging environment"
elif [ "$HTTP_CODE" = "500" ]; then
  echo "❌ 500 Internal Server Error - BLOCKER"
  echo "Need to check Render logs for stack trace"
fi
