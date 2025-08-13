#!/bin/bash
# Helper script to start vite preview server for CI

set -e

# Configuration
HOST="127.0.0.1"
PORT="4173"
PID_FILE="/tmp/preview.pid"

# Function to start the preview server
start_server() {
    echo "Starting vite preview server on $HOST:$PORT..."
    
    # Start the server in background and save PID
    npm run preview -- --host $HOST --port $PORT &
    SERVER_PID=$!
    echo $SERVER_PID > $PID_FILE
    
    echo "Preview server started with PID: $SERVER_PID"
    echo "PID saved to: $PID_FILE"
    
    # Wait a moment for the server to initialize
    sleep 2
    
    # Verify the server is running
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "✅ Server is running"
        return 0
    else
        echo "❌ Failed to start server"
        rm -f $PID_FILE
        return 1
    fi
}

# Function to stop the preview server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        SERVER_PID=$(cat $PID_FILE)
        echo "Stopping preview server (PID: $SERVER_PID)..."
        
        if kill $SERVER_PID 2>/dev/null; then
            echo "✅ Server stopped"
        else
            echo "⚠️ Server was not running"
        fi
        
        rm -f $PID_FILE
    else
        echo "No PID file found at $PID_FILE"
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    *)
        echo "Usage: $0 {start|stop}"
        exit 1
        ;;
esac