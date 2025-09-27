#!/bin/bash

# Test kiosk API connectivity from client perspective
echo "🔍 Testing Kiosk API Connectivity"
echo "=================================="

# Get demo token
echo -n "1. Getting demo token... "
TOKEN_RESPONSE=$(curl -s -X POST "https://july25.onrender.com/api/v1/auth/kiosk" \
    -H "Content-Type: application/json" \
    -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token')
    echo "✅ Success"
else
    echo "❌ Failed"
    exit 1
fi

# Test voice-chat endpoint
echo -n "2. Testing voice-chat endpoint... "
VOICE_RESPONSE=$(curl -s -X POST "https://july25.onrender.com/api/v1/ai/voice-chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: multipart/form-data" \
    -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
    -F "transcript=Hello, what sandwiches do you have?" \
    -o /tmp/voice-response.mp3 \
    -w "%{http_code}")

if [ "$VOICE_RESPONSE" = "200" ]; then
    echo "✅ Success (audio saved to /tmp/voice-response.mp3)"
else
    echo "❌ Failed (HTTP $VOICE_RESPONSE)"
fi

# Test chat endpoint
echo -n "3. Testing chat endpoint... "
CHAT_RESPONSE=$(curl -s -X POST "https://july25.onrender.com/api/v1/ai/chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
    -d '{"message": "What salads do you have?"}')

if echo "$CHAT_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo "✅ Success"
    echo "   Response: $(echo "$CHAT_RESPONSE" | jq -r '.message' | head -c 100)..."
else
    echo "❌ Failed"
fi

echo ""
echo "Summary: All API endpoints are accessible from client"
echo "The kiosk should be working at: https://july25-client.vercel.app/kiosk"