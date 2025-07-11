#!/bin/bash

echo "🚀 Starting Macon AI Gateway..."
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Must run from rebuild-6.0 directory"
    exit 1
fi

# Check if AI Gateway exists
GATEWAY_DIR="../macon-ai-gateway"
if [ ! -d "$GATEWAY_DIR" ]; then
    echo "❌ AI Gateway directory not found: $GATEWAY_DIR"
    exit 1
fi

echo "📍 Found AI Gateway at: $GATEWAY_DIR"

# Check if dependencies are installed
if [ ! -d "$GATEWAY_DIR/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$GATEWAY_DIR"
    npm install
    cd - > /dev/null
else
    echo "✅ Dependencies already installed"
fi

# Check if .env exists
if [ ! -f "$GATEWAY_DIR/.env" ]; then
    echo "❌ .env file not found in AI Gateway"
    echo "💡 Copy .env.example to .env and configure it"
    exit 1
fi

echo "✅ Environment file found"

# Start the AI Gateway
echo "🚀 Starting AI Gateway on port 3002..."
echo "📝 Logs will appear below (Ctrl+C to stop)"
echo "🌐 Health check: http://localhost:3002/health"
echo "📊 Detailed health: http://localhost:3002/health/detailed"
echo ""

cd "$GATEWAY_DIR"
npm run dev