#!/bin/bash

# Regression Alert System for Auth and Voice Ordering
# Monitors for critical regressions and sends alerts

set -e

# Configuration
SERVER_URL="${SERVER_URL:-https://july25-server.onrender.com}"
CLIENT_URL="${CLIENT_URL:-https://july25-client.vercel.app}"
ALERT_LOG="/tmp/regression-alerts.log"
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"  # Optional Slack webhook
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"  # 5 minutes default

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Alert function
send_alert() {
    local severity=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$severity] $message" >> "$ALERT_LOG"

    # Console output
    case $severity in
        CRITICAL)
            echo -e "${RED}🚨 CRITICAL: $message${NC}"
            ;;
        WARNING)
            echo -e "${YELLOW}⚠️  WARNING: $message${NC}"
            ;;
        INFO)
            echo -e "${GREEN}ℹ️  INFO: $message${NC}"
            ;;
    esac

    # Send to Slack if configured
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\":warning: [$severity] $message\"}" \
            2>/dev/null || true
    fi
}

# Check for 401 errors
check_auth_regression() {
    local response=$(curl -s -X POST "$SERVER_URL/api/v1/auth/pin-login" \
        -H "Content-Type: application/json" \
        -d '{"pin":"1234","restaurantId":"11111111-1111-1111-1111-111111111111"}' \
        -w "\nHTTP_CODE:%{http_code}" 2>/dev/null || echo "HTTP_CODE:0")

    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d')

    if [ "$http_code" == "0" ]; then
        send_alert "CRITICAL" "Server is not responding"
        return 1
    fi

    if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
        # Check if JWT has scope field
        local token=$(echo "$body" | jq -r '.token // empty' 2>/dev/null)
        if [ ! -z "$token" ]; then
            local jwt_payload=$(echo "$token" | cut -d'.' -f2 | base64 -d 2>/dev/null)
            if ! echo "$jwt_payload" | jq -e '.scope' > /dev/null 2>&1; then
                send_alert "CRITICAL" "JWT missing scope field - auth regression detected!"
                return 1
            fi
        fi
    fi

    # Test order submission for 401 errors
    if [ ! -z "$token" ]; then
        local order_response=$(curl -s -X POST "$SERVER_URL/api/v1/orders" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
            -H "X-Client-Flow: server" \
            -d '{"type":"dine-in","items":[{"id":"test","menu_item_id":"test","name":"Test","quantity":1,"price":10}],"table_number":"1","seat_number":1,"total_amount":10}' \
            -w "\nHTTP_CODE:%{http_code}" 2>/dev/null)

        local order_code=$(echo "$order_response" | grep "HTTP_CODE:" | cut -d: -f2)
        local order_body=$(echo "$order_response" | sed '/HTTP_CODE:/d')

        if [ "$order_code" == "401" ]; then
            if echo "$order_body" | grep -q "Missing required scope"; then
                send_alert "CRITICAL" "401 'Missing required scope' error - auth regression!"
                return 1
            fi
        fi
    fi

    return 0
}

# Check for React crashes
check_client_crashes() {
    local response=$(curl -s "$CLIENT_URL" | head -1000)

    # Check for common React error patterns
    if echo "$response" | grep -q "Error: Minified React error"; then
        send_alert "CRITICAL" "React application crash detected"
        return 1
    fi

    if echo "$response" | grep -q "ChunkLoadError"; then
        send_alert "WARNING" "Client chunk loading error detected"
        return 1
    fi

    return 0
}

# Check voice ordering availability
check_voice_ordering() {
    # This would need a headless browser to fully test
    # For now, check if the API endpoints are responding
    local ws_check=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/socket.io/" 2>/dev/null || echo "0")

    if [ "$ws_check" == "0" ]; then
        send_alert "WARNING" "WebSocket endpoint not responding"
        return 1
    fi

    return 0
}

# Memory leak detection (requires server metrics endpoint)
check_memory_leaks() {
    # This would integrate with your monitoring system
    # Placeholder for memory monitoring
    return 0
}

# Main monitoring loop
run_checks() {
    echo "Starting regression monitoring..."
    echo "Checking every ${CHECK_INTERVAL} seconds"
    echo "Alerts will be logged to: $ALERT_LOG"
    echo ""

    while true; do
        echo -n "$(date '+%H:%M:%S') - Running checks... "

        local failures=0

        if ! check_auth_regression; then
            ((failures++))
        fi

        if ! check_client_crashes; then
            ((failures++))
        fi

        if ! check_voice_ordering; then
            ((failures++))
        fi

        if [ $failures -eq 0 ]; then
            echo -e "${GREEN}All checks passed${NC}"
        else
            echo -e "${RED}$failures checks failed${NC}"
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# One-time check mode
if [ "$1" == "--once" ]; then
    echo "Running single regression check..."
    check_auth_regression
    check_client_crashes
    check_voice_ordering
    exit $?
fi

# Continuous monitoring mode
run_checks