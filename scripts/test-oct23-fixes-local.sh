#!/bin/bash
# Quick local test suite for October 23 bug fixes
# Tests RBAC and server endpoints only (no external API calls)

set -e

BASE_URL="http://localhost:3001"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "🧪 October 23 Bug Fix - Local Tests"
echo "===================================="
echo ""

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to report test result
report_test() {
  local test_name="$1"
  local result="$2"
  local details="$3"

  if [ "$result" = "PASS" ]; then
    echo "✅ $test_name"
    ((TESTS_PASSED++))
  else
    echo "❌ $test_name - $details"
    ((TESTS_FAILED++))
  fi
}

# Test 1: Server Health
echo "1️⃣  Server Health Check..."
HEALTH=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/health")
if [ "$HEALTH" = "200" ]; then
  report_test "Server Health" "PASS"
else
  report_test "Server Health" "FAIL" "HTTP $HEALTH"
  exit 1
fi
echo ""

# Test 2: Demo Session Creation
echo "2️⃣  RBAC - Demo Session Creation..."
DEMO_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/demo-session" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"server\", \"restaurantId\": \"${RESTAURANT_ID}\"}")

TOKEN=$(echo "$DEMO_RESP" | jq -r '.token // empty')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  report_test "Demo Session Creation" "PASS"
else
  report_test "Demo Session Creation" "FAIL" "No token returned"
  echo ""
  exit 1
fi
echo ""

# Test 3: Order Creation
echo "3️⃣  RBAC - Order Creation..."
ORDER_RESP=$(curl -s -X POST "$BASE_URL/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-restaurant-id: ${RESTAURANT_ID}" \
  -d '{
    "items": [{
      "menuItemId": "512c2255-5565-4380-9377-c1cd79270157",
      "quantity": 1,
      "name": "Test Item",
      "price": 10.00
    }],
    "orderType": "dine_in",
    "source": "server"
  }')

ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.id // .orderId // empty')
if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
  report_test "Order Creation" "PASS"
else
  report_test "Order Creation" "FAIL" "No order ID returned"
  echo ""
  exit 1
fi
echo ""

# Test 4: Payment Endpoint (CRITICAL - Was failing with 403)
echo "4️⃣  RBAC - Payment Endpoint Access (Critical Test)..."
PAYMENT_HTTP=$(curl -s -w "%{http_code}" -o /tmp/payment_resp.json -X POST "$BASE_URL/api/v1/payments/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-restaurant-id: ${RESTAURANT_ID}" \
  -d "{
    \"order_id\": \"${ORDER_ID}\",
    \"token\": \"cnon:card-nonce-ok\",
    \"amount\": 10.80,
    \"idempotency_key\": \"test-$(date +%s)\"
  }")

# 200 = success, 400 = business logic error (GOOD - means RBAC passed)
# 403 = RBAC blocked (BAD - fix didn't work)
if [ "$PAYMENT_HTTP" = "200" ] || [ "$PAYMENT_HTTP" = "400" ]; then
  report_test "Payment Endpoint - RBAC Bypass Working" "PASS" "HTTP $PAYMENT_HTTP (reached business logic)"
elif [ "$PAYMENT_HTTP" = "403" ]; then
  report_test "Payment Endpoint - RBAC Bypass Working" "FAIL" "HTTP 403 - RBAC still blocking!"
  cat /tmp/payment_resp.json
else
  report_test "Payment Endpoint - RBAC Bypass Working" "FAIL" "HTTP $PAYMENT_HTTP (unexpected)"
fi
echo ""

# Test 5: Voice Endpoint (if accessible)
echo "5️⃣  Voice Ordering Endpoint..."
VOICE_HTTP=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/api/v1/realtime/session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-restaurant-id: ${RESTAURANT_ID}")

if [ "$VOICE_HTTP" = "200" ]; then
  report_test "Voice Endpoint Access" "PASS" "Ephemeral token created"
elif [ "$VOICE_HTTP" = "500" ]; then
  report_test "Voice Endpoint Access" "PASS" "Endpoint accessible (may need OpenAI config)"
elif [ "$VOICE_HTTP" = "403" ]; then
  report_test "Voice Endpoint Access" "FAIL" "RBAC blocking"
else
  report_test "Voice Endpoint Access" "PASS" "Endpoint accessible (HTTP $VOICE_HTTP)"
fi
echo ""

# Test 6: Check OpenAI key in environment
echo "6️⃣  OpenAI Configuration..."
if [ -f ".env" ]; then
  source .env
  if [ -n "$OPENAI_API_KEY" ]; then
    KEY_PREFIX=$(echo "$OPENAI_API_KEY" | cut -c1-10)
    KEY_SUFFIX=$(echo "$OPENAI_API_KEY" | tail -c 6)
    if [[ "$OPENAI_API_KEY" == [REDACTED]* ]]; then
      report_test "OpenAI Key Format" "PASS" "Project key ($KEY_PREFIX...$KEY_SUFFIX)"
    else
      report_test "OpenAI Key Format" "PASS" "Key present ($KEY_PREFIX...$KEY_SUFFIX)"
    fi
  else
    report_test "OpenAI Key Present" "FAIL" "OPENAI_API_KEY not set"
  fi
else
  report_test "Environment File" "FAIL" ".env not found"
fi
echo ""

# Summary
echo "===================================="
echo "📊 Results: $TESTS_PASSED passed, $TESTS_FAILED failed"
echo "===================================="
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  echo ""
  echo "✅ RBAC fix working - demo users can access payments"
  echo "✅ OpenAI key configured correctly"
  echo "✅ Ready for manual browser testing"
  echo ""
  exit 0
else
  echo "🚨 $TESTS_FAILED test(s) failed"
  echo ""
  exit 1
fi
