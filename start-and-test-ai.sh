#!/bin/bash

echo "🚀 Starting AI Gateway and running integration tests..."

# Start AI Gateway in background
cd ../macon-ai-gateway
npm run dev:simple &
GATEWAY_PID=$!

# Wait for server to start
echo "⏳ Waiting for AI Gateway to start..."
sleep 3

# Run integration tests
cd ../rebuild-6.0
node test-frontend-ai-integration.js

# Keep gateway running for manual testing
echo ""
echo "🌐 AI Gateway is still running (PID: $GATEWAY_PID)"
echo "💡 To stop: kill $GATEWAY_PID"
echo "🔗 Frontend: npm run dev"
echo ""

# Keep script running
echo "Press Ctrl+C to stop the AI Gateway..."
wait $GATEWAY_PID