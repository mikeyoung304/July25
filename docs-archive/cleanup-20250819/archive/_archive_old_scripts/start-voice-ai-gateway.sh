#!/bin/bash

echo "🎤 Starting AI Gateway with Voice WebSocket support..."

# Check if node modules are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install express cors dotenv ws openai multer
fi

# Check for .env file
if [ ! -f ".env" ]; then
  echo "⚠️  No .env file found. Creating one..."
  cp .env.example .env 2>/dev/null || echo "PORT=3002" > .env
  echo "Please add your OPENAI_API_KEY to the .env file"
fi

# Kill any existing process on port 3002
echo "🔄 Checking for existing services on port 3002..."
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Start the enhanced AI Gateway
echo "🚀 Starting Voice-enabled AI Gateway on port 3002..."
echo "📡 WebSocket available at ws://localhost:3002/voice-stream"
echo "🎯 Chat endpoint at http://localhost:3002/chat"
echo ""
echo "Press Ctrl+C to stop"

# Run the AI Gateway with WebSocket support
node ai-gateway-websocket.js