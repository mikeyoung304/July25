#!/bin/bash

# Load Testing Runner Script
# Executes payment and order flow load tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3001"}
RESTAURANT_ID=${RESTAURANT_ID:-"11111111-1111-1111-1111-111111111111"}
AUTH_TOKEN=${AUTH_TOKEN:-"test-token"}

echo "🚀 Restaurant OS Load Testing Suite"
echo "=================================="
echo "Target: $BASE_URL"
echo "Restaurant: $RESTAURANT_ID"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Install k6 first: https://k6.io/docs/getting-started/installation/"
    echo ""
    echo "Quick install options:"
    echo "  macOS:  brew install k6"
    echo "  Ubuntu: sudo snap install k6"
    echo "  Docker: docker pull grafana/k6"
    exit 1
fi

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    echo "----------------------------------------"
    
    k6 run \
        -e BASE_URL="$BASE_URL" \
        -e RESTAURANT_ID="$RESTAURANT_ID" \
        -e AUTH_TOKEN="$AUTH_TOKEN" \
        -e MANAGER_TOKEN="${MANAGER_TOKEN:-test-manager-token}" \
        -e SERVER_TOKEN="${SERVER_TOKEN:-test-server-token}" \
        -e CASHIER_TOKEN="${CASHIER_TOKEN:-test-cashier-token}" \
        -e KITCHEN_TOKEN="${KITCHEN_TOKEN:-test-kitchen-token}" \
        "$test_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
    echo ""
}

# Create results directory
mkdir -p results
cd results

# Menu selection
echo "Select test to run:"
echo "1) Payment Load Test (100 concurrent users)"
echo "2) Order Flow Test (Multi-role simulation)"
echo "3) Both Tests (Sequential)"
echo "4) Quick Smoke Test (5 users, 30 seconds)"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        run_test "Payment Load Test" "../payment-load-test.ts"
        ;;
    2)
        run_test "Order Flow Test" "../order-flow-test.ts"
        ;;
    3)
        run_test "Payment Load Test" "../payment-load-test.ts"
        echo "Waiting 30 seconds before next test..."
        sleep 30
        run_test "Order Flow Test" "../order-flow-test.ts"
        ;;
    4)
        echo -e "${YELLOW}Running Quick Smoke Test...${NC}"
        k6 run \
            -e BASE_URL="$BASE_URL" \
            -e RESTAURANT_ID="$RESTAURANT_ID" \
            -e AUTH_TOKEN="$AUTH_TOKEN" \
            --vus 5 \
            --duration 30s \
            "../payment-load-test.ts"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Summary
echo ""
echo "=================================="
echo "📊 Test Results Summary"
echo "=================================="

# Check for results files
if [ -f "payment-load-test-results.json" ]; then
    echo "✅ Payment test results: ./results/payment-load-test-results.json"
    echo "📈 HTML Report: ./results/payment-load-test-results.html"
fi

if [ -f "order-flow-test-results.json" ]; then
    echo "✅ Order flow results: ./results/order-flow-test-results.json"
    echo "📈 HTML Report: ./results/order-flow-test-results.html"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Review the HTML reports for detailed metrics"
echo "2. Check if all thresholds passed"
echo "3. Analyze any RBAC violations or errors"
echo "4. Monitor server resources during tests"

# Open HTML report if on macOS
if [ -f "payment-load-test-results.html" ] && [ "$(uname)" == "Darwin" ]; then
    read -p "Open HTML report in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open payment-load-test-results.html
    fi
fi

echo ""
echo "✨ Load testing complete!"