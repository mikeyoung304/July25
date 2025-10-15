#!/bin/bash
# Test payment flow to identify 500 error

BASE_URL="https://july25.onrender.com"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "=== Step 1: Create Order ==="
ORDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
  -d '{
    "type": "online",
    "items": [{
      "menu_item_id": "test-item-123",
      "name": "Test Burger",
      "quantity": 1,
      "price": 10.00,
      "modifiers": [],
      "special_instructions": ""
    }],
    "customer_name": "Test User",
    "customer_email": "test@example.com",
    "customer_phone": "5551234567",
    "notes": "Test order",
    "subtotal": 10.00,
    "tax": 0.70,
    "tip": 0,
    "total_amount": 10.70
  }')

echo "$ORDER_RESPONSE" | jq '.'

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id // empty')

if [ -z "$ORDER_ID" ]; then
  echo "ERROR: Failed to create order"
  exit 1
fi

echo ""
echo "=== Step 2: Process Payment (order_id: $ORDER_ID) ==="
PAYMENT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/v1/payments/create" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: ${RESTAURANT_ID}" \
  -d "{
    \"order_id\": \"${ORDER_ID}\",
    \"token\": \"demo-token\",
    \"idempotency_key\": \"test-$(date +%s)\"
  }")

HTTP_STATUS=$(echo "$PAYMENT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$PAYMENT_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo ""
echo "=== Analysis ==="
if [ "$HTTP_STATUS" = "500" ]; then
  echo "❌ 500 Internal Server Error confirmed"
  echo "Check Render logs for stack trace at timestamp: $(date -u +%Y-%m-%dT%H:%M:%S)"
else
  echo "✅ Request completed with status: $HTTP_STATUS"
fi
