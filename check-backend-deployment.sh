#!/bin/bash
# Check if backend has deployed with new session config

echo "Checking backend deployment status..."
echo "Looking for instructions in /api/v1/realtime/session response..."
echo ""

# Test the session endpoint (requires auth, but we can check error response structure)
response=$(curl -s -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H "Content-Type: application/json" \
  -H "x-restaurant-id: grow")

echo "Response preview:"
echo "$response" | jq -C '.' 2>/dev/null || echo "$response"

echo ""
echo "Backend health:"
curl -s https://july25.onrender.com/api/v1/health | jq -C '.'

echo ""
echo "✅ If you see structured JSON responses, backend is running"
echo "🔄 Render deploys from main automatically (3-5 minutes)"
echo "📝 New code will include instructions in ephemeral token creation"
