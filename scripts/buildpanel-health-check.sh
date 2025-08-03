#!/bin/bash

# BuildPanel Health Check Script
# Monitors BuildPanel service connectivity and alerts on issues

set -e

BUILDPANEL_URL="${BUILDPANEL_URL:-http://localhost:3003}"
BACKEND_URL="http://localhost:3001"
LOG_FILE="buildpanel-health.log"
ALERT_THRESHOLD=3  # Alert after 3 consecutive failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏥 BuildPanel Health Check${NC}"
echo -e "${BLUE}================================${NC}"
echo "BuildPanel URL: $BUILDPANEL_URL"
echo "Backend URL: $BACKEND_URL"
echo "Timestamp: $(date)"
echo ""

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to check BuildPanel direct health
check_buildpanel_direct() {
    echo -n "🔍 BuildPanel Direct Health... "
    
    if curl -s --connect-timeout 5 --max-time 10 "$BUILDPANEL_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ CONNECTED${NC}"
        log_message "BuildPanel direct health: CONNECTED"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        log_message "BuildPanel direct health: FAILED"
        return 1
    fi
}

# Function to check BuildPanel through backend
check_buildpanel_backend() {
    echo -n "🔍 BuildPanel via Backend... "
    
    local response=$(curl -s --connect-timeout 5 --max-time 10 "$BACKEND_URL/health/status" 2>/dev/null)
    local bp_status=$(echo "$response" | jq -r '.services.buildpanel.status' 2>/dev/null)
    
    if [ "$bp_status" = "connected" ]; then
        echo -e "${GREEN}✅ CONNECTED${NC}"
        log_message "BuildPanel backend health: CONNECTED"
        return 0
    else
        echo -e "${RED}❌ $bp_status${NC}"
        log_message "BuildPanel backend health: $bp_status"
        return 1
    fi
}

# Function to check BuildPanel response time
check_buildpanel_performance() {
    echo -n "⏱️  BuildPanel Response Time... "
    
    local start_time=$(date +%s%N)
    if curl -s --connect-timeout 5 --max-time 30 "$BUILDPANEL_URL/health" > /dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [ $response_time -lt 1000 ]; then
            echo -e "${GREEN}✅ ${response_time}ms${NC}"
        elif [ $response_time -lt 5000 ]; then
            echo -e "${YELLOW}⚠️  ${response_time}ms (SLOW)${NC}"
        else
            echo -e "${RED}❌ ${response_time}ms (TOO SLOW)${NC}"
        fi
        
        log_message "BuildPanel response time: ${response_time}ms"
        return 0
    else
        echo -e "${RED}❌ TIMEOUT${NC}"
        log_message "BuildPanel response time: TIMEOUT"
        return 1
    fi
}

# Function to test AI endpoints
test_ai_endpoints() {
    echo -n "🤖 AI Endpoints Test... "
    
    # Test menu endpoint
    if curl -s --connect-timeout 5 --max-time 10 \
        -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
        "$BUILDPANEL_URL/api/menu" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MENU ACCESSIBLE${NC}"
        log_message "BuildPanel AI endpoints: ACCESSIBLE"
        return 0
    else
        echo -e "${RED}❌ MENU INACCESSIBLE${NC}"
        log_message "BuildPanel AI endpoints: INACCESSIBLE"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    echo -e "\n${BLUE}📊 System Resources${NC}"
    
    # Memory usage
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}')
    echo "💾 Memory Usage: ${mem_usage}%"
    
    # Disk usage
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "💽 Disk Usage: ${disk_usage}%"
    
    # CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "🔥 CPU Load: $cpu_load"
    
    log_message "System - Memory: ${mem_usage}%, Disk: ${disk_usage}%, CPU: $cpu_load"
}

# Function to get failure count
get_failure_count() {
    local count_file="/tmp/buildpanel_failures"
    if [ -f "$count_file" ]; then
        cat "$count_file"
    else
        echo "0"
    fi
}

# Function to update failure count
update_failure_count() {
    local current_count=$1
    local count_file="/tmp/buildpanel_failures"
    echo "$current_count" > "$count_file"
}

# Function to send alert (placeholder - integrate with your alert system)
send_alert() {
    local message="$1"
    echo -e "${RED}🚨 ALERT: $message${NC}"
    log_message "ALERT: $message"
    
    # Example integrations (uncomment as needed):
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   "$SLACK_WEBHOOK_URL"
    
    # echo "$message" | mail -s "BuildPanel Alert" admin@yourcompany.com
}

# Main health check execution
main() {
    local failure_count=0
    local checks_passed=0
    local total_checks=4
    
    # Run all health checks
    if check_buildpanel_direct; then
        ((checks_passed++))
    else
        ((failure_count++))
    fi
    
    if check_buildpanel_backend; then
        ((checks_passed++))
    else
        ((failure_count++))
    fi
    
    if check_buildpanel_performance; then
        ((checks_passed++))
    else
        ((failure_count++))
    fi
    
    if test_ai_endpoints; then
        ((checks_passed++))
    else
        ((failure_count++))
    fi
    
    # System resource check (informational)
    check_system_resources
    
    # Summary
    echo -e "\n${BLUE}📊 Health Check Summary${NC}"
    echo -e "${BLUE}========================${NC}"
    echo "Checks Passed: $checks_passed/$total_checks"
    
    if [ $failure_count -eq 0 ]; then
        echo -e "${GREEN}🎉 All BuildPanel checks passed!${NC}"
        update_failure_count 0
        log_message "Health check: ALL PASSED"
        return 0
    else
        echo -e "${RED}❌ $failure_count check(s) failed${NC}"
        
        # Track consecutive failures
        local consecutive_failures=$(get_failure_count)
        ((consecutive_failures++))
        update_failure_count $consecutive_failures
        
        if [ $consecutive_failures -ge $ALERT_THRESHOLD ]; then
            send_alert "BuildPanel has failed $consecutive_failures consecutive health checks"
        fi
        
        log_message "Health check: $failure_count FAILED (consecutive: $consecutive_failures)"
        return 1
    fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl is required but not installed${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq is recommended for better JSON parsing${NC}"
fi

# Run main function
main

# Exit with appropriate code
if [ $? -eq 0 ]; then
    exit 0
else
    exit 1
fi