#!/bin/bash

echo "🚀 Starting Grow Fresh Local Food System..."

# Get the backend directory path (where this script is located)
BACKEND_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
FRONTEND_DIR="$( cd "$BACKEND_DIR/.." && pwd )"

# Check if all directories exist
if [ ! -d "$FRONTEND_DIR/../macon-ai-gateway" ]; then
    echo "❌ AI Gateway not found at $FRONTEND_DIR/../macon-ai-gateway"
    echo "Please ensure AI Gateway is in the correct location"
    exit 1
fi

# Start Backend
echo "1️⃣ Starting Backend API..."
osascript -e "tell app \"Terminal\" to do script \"cd '$BACKEND_DIR' && npm run dev\""

# Start Frontend
echo "2️⃣ Starting Frontend..."
osascript -e "tell app \"Terminal\" to do script \"cd '$FRONTEND_DIR' && npm run dev\""

# Start AI Gateway
echo "3️⃣ Starting AI Gateway..."
osascript -e "tell app \"Terminal\" to do script \"cd '$FRONTEND_DIR/../macon-ai-gateway' && npm run dev:ai\""

echo "
✅ All services starting...
   Backend:    http://localhost:3001
   Frontend:   http://localhost:5173
   AI Gateway: http://localhost:3002

⏳ Wait 10 seconds for services to start, then run:
   npm run upload:menu
"