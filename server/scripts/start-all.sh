#!/bin/bash

echo "🚀 Starting Grow Fresh Local Food System (Unified Backend)..."

# Get the server directory path (where this script is located)
SERVER_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
CLIENT_DIR="$( cd "$SERVER_DIR/../client" && pwd )"

# Check if client directory exists
if [ ! -d "$CLIENT_DIR" ]; then
    echo "❌ Client directory not found at $CLIENT_DIR"
    echo "Please ensure the client directory exists"
    exit 1
fi

# Start Unified Backend (includes API + AI)
echo "1️⃣ Starting Unified Backend..."
osascript -e "tell app \"Terminal\" to do script \"cd '$SERVER_DIR' && npm run dev\""

# Start Frontend
echo "2️⃣ Starting Frontend..."
osascript -e "tell app \"Terminal\" to do script \"cd '$CLIENT_DIR' && npm run dev\""

echo "
✅ All services starting...
   Unified Backend: http://localhost:3001
   - REST API:      http://localhost:3001/api/v1
   - Voice AI:      http://localhost:3001/api/v1/ai
   - WebSocket:     ws://localhost:3001
   
   Frontend:        http://localhost:5173

⏳ Wait 10 seconds for services to start, then run:
   npm run upload:menu
"