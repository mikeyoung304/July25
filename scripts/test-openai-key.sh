#!/bin/bash
# Test OpenAI API key for realtime sessions

set -e

# Load environment
source /Users/mikeyoung/CODING/rebuild-6.0/.env

echo "🔍 Testing OpenAI API Key..."
echo "Key format: ${OPENAI_API_KEY:0:15}...${OPENAI_API_KEY: -10}"
echo "Key length: $(echo -n "$OPENAI_API_KEY" | wc -c) characters"
echo ""

# Test 1: Basic API access (list models)
echo "1️⃣  Testing basic API access (list models)..."
MODELS_RESPONSE=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY")

HTTP_CODE=$(echo "$MODELS_RESPONSE" | tail -n1)
MODELS_BODY=$(echo "$MODELS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Basic API access works"
else
  echo "❌ Basic API access failed (HTTP $HTTP_CODE)"
  echo "$MODELS_BODY" | jq '.' 2>/dev/null || echo "$MODELS_BODY"
  echo ""
  echo "🚨 API key is invalid or expired"
  exit 1
fi
echo ""

# Test 2: Realtime sessions endpoint (what's actually failing)
echo "2️⃣  Testing realtime sessions endpoint..."
REALTIME_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.openai.com/v1/realtime/sessions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-realtime-preview-2024-10-01"}')

HTTP_CODE=$(echo "$REALTIME_RESPONSE" | tail -n1)
REALTIME_BODY=$(echo "$REALTIME_RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Realtime sessions endpoint works!"
  echo ""
  echo "🎉 OpenAI API key is valid for realtime API"
  exit 0
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Realtime sessions endpoint failed with 401 Unauthorized"
  echo ""
  echo "Response:"
  echo "$REALTIME_BODY" | jq '.' 2>/dev/null || echo "$REALTIME_BODY"
  echo ""
  echo "🚨 Possible issues:"
  echo "   - API key doesn't have access to realtime API"
  echo "   - API key is for wrong project/organization"
  echo "   - Realtime API not enabled for this account"
  exit 1
else
  echo "⚠️  Unexpected status code: $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$REALTIME_BODY" | jq '.' 2>/dev/null || echo "$REALTIME_BODY"
  exit 1
fi
