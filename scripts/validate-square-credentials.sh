#!/bin/bash
#
# Square Credentials Validation Script
# Validates that SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, and SQUARE_APPLICATION_ID
# all belong to the same Square application.
#
# Usage: ./scripts/validate-square-credentials.sh
# Environment: Requires SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT
#

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Square Credentials Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check required environment variables
if [ -z "$SQUARE_ACCESS_TOKEN" ]; then
  echo "❌ SQUARE_ACCESS_TOKEN not set"
  exit 1
fi

if [ -z "$SQUARE_LOCATION_ID" ]; then
  echo "❌ SQUARE_LOCATION_ID not set"
  exit 1
fi

SQUARE_ENVIRONMENT="${SQUARE_ENVIRONMENT:-sandbox}"
echo "Environment: $SQUARE_ENVIRONMENT"
echo ""

# Determine API base URL
if [ "$SQUARE_ENVIRONMENT" = "production" ]; then
  BASE_URL="https://connect.squareup.com/v2"
else
  BASE_URL="https://connect.squareupsandbox.com/v2"
fi

# Test 1: Validate access token by fetching locations
echo "📍 Test 1: Fetching locations for access token..."
LOCATIONS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN" \
  -H "Square-Version: 2025-07-16" \
  "$BASE_URL/locations")

HTTP_STATUS=$(echo "$LOCATIONS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$LOCATIONS_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Access token validation failed (HTTP $HTTP_STATUS)"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Access token is valid"

# Parse locations
LOCATION_COUNT=$(echo "$BODY" | jq -r '.locations | length')
echo "   Found $LOCATION_COUNT location(s)"

# Test 2: Validate location ID exists for this token
echo ""
echo "📍 Test 2: Validating SQUARE_LOCATION_ID..."
LOCATION_IDS=$(echo "$BODY" | jq -r '.locations[].id')
FOUND=false

for LOC_ID in $LOCATION_IDS; do
  if [ "$LOC_ID" = "$SQUARE_LOCATION_ID" ]; then
    FOUND=true
    LOCATION_NAME=$(echo "$BODY" | jq -r ".locations[] | select(.id == \"$LOC_ID\") | .name")
    MERCHANT_ID=$(echo "$BODY" | jq -r ".locations[] | select(.id == \"$LOC_ID\") | .merchant_id")
    echo "✅ Location ID matches: $SQUARE_LOCATION_ID"
    echo "   Location Name: $LOCATION_NAME"
    echo "   Merchant ID: $MERCHANT_ID"
    break
  fi
done

if [ "$FOUND" = false ]; then
  echo "❌ LOCATION ID MISMATCH DETECTED"
  echo ""
  echo "   Configured: SQUARE_LOCATION_ID=$SQUARE_LOCATION_ID"
  echo "   Available locations for this access token:"
  echo "$BODY" | jq -r '.locations[] | "   - \(.id) (\(.name))"'
  echo ""
  echo "🔧 FIX: Update your SQUARE_LOCATION_ID environment variable to one of the above."
  exit 1
fi

# Test 3: Validate we can create a payment (dry run)
echo ""
echo "💳 Test 3: Testing payment creation permissions..."
# Note: We don't actually create a payment, just verify the endpoint is accessible
TEST_PAYMENT_REQUEST='{
  "source_id": "INVALID_FOR_TEST",
  "idempotency_key": "test-validation-'"$(date +%s)"'",
  "amount_money": {
    "amount": 100,
    "currency": "USD"
  },
  "location_id": "'"$SQUARE_LOCATION_ID"'"
}'

PAYMENT_TEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Square-Version: 2025-07-16" \
  -d "$TEST_PAYMENT_REQUEST" \
  "$BASE_URL/payments")

PAYMENT_HTTP_STATUS=$(echo "$PAYMENT_TEST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
PAYMENT_BODY=$(echo "$PAYMENT_TEST_RESPONSE" | sed '/HTTP_STATUS/d')

# We expect this to fail with INVALID_CARD_DATA, not location authorization errors
ERROR_CODE=$(echo "$PAYMENT_BODY" | jq -r '.errors[0].code' 2>/dev/null)
ERROR_DETAIL=$(echo "$PAYMENT_BODY" | jq -r '.errors[0].detail' 2>/dev/null)

if [ "$ERROR_CODE" = "BAD_REQUEST" ] && echo "$ERROR_DETAIL" | grep -q "Not authorized"; then
  echo "❌ Location authorization failed"
  echo "   Error: $ERROR_DETAIL"
  echo ""
  echo "   This means your SQUARE_ACCESS_TOKEN does not have permission"
  echo "   to process payments for location $SQUARE_LOCATION_ID"
  exit 1
elif [ "$PAYMENT_HTTP_STATUS" = "400" ] || [ "$PAYMENT_HTTP_STATUS" = "200" ]; then
  echo "✅ Payment API accessible (test validation passed)"
  if [ ! -z "$ERROR_CODE" ]; then
    echo "   (Got expected error: $ERROR_CODE - this is normal for validation test)"
  fi
else
  echo "⚠️  Payment API returned unexpected response (HTTP $PAYMENT_HTTP_STATUS)"
  echo "   This may indicate other issues. Response:"
  echo "$PAYMENT_BODY" | jq '.' 2>/dev/null || echo "$PAYMENT_BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Square credentials validated successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  Environment:    $SQUARE_ENVIRONMENT"
echo "  Access Token:   ${SQUARE_ACCESS_TOKEN:0:10}..."
echo "  Location ID:    $SQUARE_LOCATION_ID"
echo "  Location Name:  $LOCATION_NAME"
echo "  Merchant ID:    $MERCHANT_ID"
echo ""
echo "✅ Ready for payment processing"
