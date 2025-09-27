#!/bin/bash

# Kill processes on common development ports
echo "🔥 Killing processes on ports 3001 and 5173..."

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 3001" || echo "→ Port 3001 was already free"

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 5173" || echo "→ Port 5173 was already free"

# Optional: Kill any node processes that might be hanging
# Uncomment if you want more aggressive cleanup
# pkill -f "node.*rebuild-6.0" 2>/dev/null && echo "✓ Killed hanging node processes" || echo "→ No hanging node processes"

echo ""
echo "🚀 Starting development servers..."
npm run dev