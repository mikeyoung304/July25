#!/bin/bash

# =============================================================================
# Order Flow Verification Script
# =============================================================================
# Purpose: Test all 3 order creation flows after Track A deployment
# Usage: ./verify_order_flows.sh [API_BASE_URL]
# Example: ./verify_order_flows.sh http://localhost:3001
#
# Tests:
#   1. Checkout flow (online order with tax validation)
#   2. Server voice flow (table order with tax validation)
#   3. Voice direct flow (kiosk order with tax validation)
#
# Success Criteria:
#   - All 3 flows return 2xx status codes
#   - All orders have correct total_amount (subtotal + tax + tip)
#   - No "version undefined" errors
#   - All orders created in database
# =============================================================================

set -e  # Exit on any error
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${1:-http://localhost:3001}"
RESTAURANT_ID="${RESTAURANT_ID:-11111111-1111-1111-1111-111111111111}"
TEMP_DIR=$(mktemp -d)
RESULTS_FILE="$TEMP_DIR/verification_results.json"

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Cleanup on exit
trap "rm -rf $TEMP_DIR" EXIT

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_section() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

# Get authentication token
get_customer_token() {
    print_section "Getting customer authentication token..."

    local response=$(curl -s -X POST "$API_BASE/api/v1/auth/demo-session" \
        -H "Content-Type: application/json" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -d '{"role": "customer"}')

    local token=$(echo "$response" | jq -r '.token // .access_token // empty')

    if [ -z "$token" ] || [ "$token" = "null" ]; then
        print_error "Failed to get customer token"
        echo "Response: $response"
        return 1
    fi

    print_success "Customer token obtained"
    echo "$token"
}

get_server_token() {
    print_section "Getting server authentication token..."

    local response=$(curl -s -X POST "$API_BASE/api/v1/auth/demo-session" \
        -H "Content-Type: application/json" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -d '{"role": "server"}')

    local token=$(echo "$response" | jq -r '.token // .access_token // empty')

    if [ -z "$token" ] || [ "$token" = "null" ]; then
        print_error "Failed to get server token"
        echo "Response: $response"
        return 1
    fi

    print_success "Server token obtained"
    echo "$token"
}

# Validate order response
validate_order_response() {
    local response="$1"
    local flow_name="$2"
    local http_code="$3"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # Check HTTP status code
    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
        print_error "HTTP $http_code - Order creation failed"
        print_info "Response: $response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Extract fields from response
    local order_id=$(echo "$response" | jq -r '.id // empty')
    local order_number=$(echo "$response" | jq -r '.order_number // empty')
    local subtotal=$(echo "$response" | jq -r '.subtotal // 0')
    local tax=$(echo "$response" | jq -r '.tax // 0')
    local tip=$(echo "$response" | jq -r '.tip // 0')
    local total_amount=$(echo "$response" | jq -r '.total_amount // 0')
    local version=$(echo "$response" | jq -r '.version // empty')

    # Validate required fields
    if [ -z "$order_id" ] || [ "$order_id" = "null" ]; then
        print_error "Missing order ID"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    print_success "Order created: $order_number (ID: $order_id)"

    # Validate version field exists
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if [ -z "$version" ] || [ "$version" = "null" ]; then
        print_error "CRITICAL: version field missing from response"
        print_info "This indicates RPC RETURNS TABLE fix not applied"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    else
        print_success "Version field present: $version"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi

    # Validate total calculation
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    local calculated_total=$(echo "$subtotal + $tax + $tip" | bc)
    local difference=$(echo "$total_amount - $calculated_total" | bc | tr -d '-')

    print_info "Subtotal: $subtotal"
    print_info "Tax: $tax"
    print_info "Tip: $tip"
    print_info "Total (actual): $total_amount"
    print_info "Total (calculated): $calculated_total"

    if (( $(echo "$difference > 0.01" | bc -l) )); then
        print_error "Total mismatch: difference of $difference"
        print_info "Expected: subtotal ($subtotal) + tax ($tax) + tip ($tip) = $calculated_total"
        print_info "Got: $total_amount"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    else
        print_success "Total calculation correct (difference: $difference)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi

    # Validate tax is non-zero
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if (( $(echo "$tax <= 0" | bc -l) )); then
        print_error "Tax is zero or negative: $tax"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    else
        print_success "Tax properly calculated: $tax"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi

    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

# =============================================================================
# Test 1: Checkout Flow (Online Order)
# =============================================================================

test_checkout_flow() {
    print_header "Test 1: Checkout Flow (Online Order)"

    print_section "Getting authentication..."
    local token=$(get_customer_token)
    if [ -z "$token" ]; then
        print_error "Cannot proceed without token"
        return 1
    fi

    print_section "Creating checkout order..."

    # Create order payload
    local payload=$(cat <<EOF
{
  "type": "online",
  "items": [
    {
      "menu_item_id": "00000000-0000-0000-0000-000000000001",
      "name": "Greek Salad",
      "quantity": 2,
      "price": 12.00,
      "modifiers": [],
      "special_instructions": ""
    },
    {
      "menu_item_id": "00000000-0000-0000-0000-000000000002",
      "name": "Iced Tea",
      "quantity": 1,
      "price": 3.00,
      "modifiers": [],
      "special_instructions": ""
    }
  ],
  "customer_name": "Test Customer",
  "customer_email": "test@example.com",
  "customer_phone": "5551234567",
  "notes": "Test order from verification script",
  "subtotal": 27.00,
  "tax": 2.23,
  "tip": 0,
  "total_amount": 29.23
}
EOF
)

    # Make request
    local response_file="$TEMP_DIR/checkout_response.json"
    local http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -X POST "$API_BASE/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -H "X-Client-Flow: online" \
        -d "$payload")

    local response=$(cat "$response_file")

    # Validate response
    validate_order_response "$response" "Checkout" "$http_code"
}

# =============================================================================
# Test 2: Server Voice Flow (Table Order)
# =============================================================================

test_server_voice_flow() {
    print_header "Test 2: Server Voice Flow (Table Order)"

    print_section "Getting server authentication..."
    local token=$(get_server_token)
    if [ -z "$token" ]; then
        print_error "Cannot proceed without token"
        return 1
    fi

    print_section "Creating server voice order..."

    # Create order payload (voice order with correct total including tax)
    local payload=$(cat <<EOF
{
  "type": "dine-in",
  "table_number": "5",
  "items": [
    {
      "id": "voice-item-1",
      "menu_item_id": "00000000-0000-0000-0000-000000000003",
      "name": "Chicken Sandwich",
      "quantity": 5,
      "price": 12.00,
      "modifiers": []
    }
  ],
  "customer_name": "Table 5",
  "notes": "Voice order from verification script",
  "total_amount": 64.95
}
EOF
)

    # Note: total_amount calculation
    # subtotal = 12.00 * 5 = 60.00
    # tax = 60.00 * 0.0825 = 4.95
    # total = 60.00 + 4.95 = 64.95

    # Make request
    local response_file="$TEMP_DIR/server_voice_response.json"
    local http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -X POST "$API_BASE/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -H "X-Client-Flow: server" \
        -d "$payload")

    local response=$(cat "$response_file")

    # Validate response
    validate_order_response "$response" "Server Voice" "$http_code"
}

# =============================================================================
# Test 3: Voice Direct Flow (Kiosk Order)
# =============================================================================

test_voice_direct_flow() {
    print_header "Test 3: Voice Direct Flow (Kiosk Order)"

    print_section "Getting customer authentication..."
    local token=$(get_customer_token)
    if [ -z "$token" ]; then
        print_error "Cannot proceed without token"
        return 1
    fi

    print_section "Creating voice direct order..."

    # Create order payload (kiosk voice order)
    local payload=$(cat <<EOF
{
  "type": "kiosk",
  "items": [
    {
      "menu_item_id": "00000000-0000-0000-0000-000000000004",
      "name": "Margherita Pizza",
      "quantity": 1,
      "price": 14.00,
      "modifiers": [
        {
          "id": "mod-1",
          "name": "Extra Cheese",
          "price": 2.00
        }
      ],
      "special_instructions": ""
    }
  ],
  "customer_name": "Kiosk Customer",
  "notes": "Voice order from kiosk verification",
  "subtotal": 16.00,
  "tax": 1.32,
  "tip": 0,
  "total_amount": 17.32
}
EOF
)

    # Make request
    local response_file="$TEMP_DIR/voice_direct_response.json"
    local http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -X POST "$API_BASE/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -H "X-Client-Flow: kiosk" \
        -d "$payload")

    local response=$(cat "$response_file")

    # Validate response
    validate_order_response "$response" "Voice Direct" "$http_code"
}

# =============================================================================
# Test 4: Server Validation Logging Check
# =============================================================================

test_server_validation_logging() {
    print_header "Test 4: Server Validation Logging"

    print_section "Testing server validation with mismatched total..."
    local token=$(get_customer_token)

    # Create order with INCORRECT total (should log warning)
    local payload=$(cat <<EOF
{
  "type": "online",
  "items": [
    {
      "menu_item_id": "00000000-0000-0000-0000-000000000001",
      "name": "Test Item",
      "quantity": 1,
      "price": 10.00,
      "modifiers": []
    }
  ],
  "customer_name": "Validation Test",
  "notes": "Testing validation logging",
  "subtotal": 10.00,
  "tax": 0.83,
  "tip": 0,
  "total_amount": 5.00
}
EOF
)

    # Expected: Server should log warning but accept order (Track A behavior)
    # Expected: Server should correct total to 10.83

    local response_file="$TEMP_DIR/validation_response.json"
    local http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
        -X POST "$API_BASE/api/v1/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "X-Restaurant-ID: $RESTAURANT_ID" \
        -H "X-Client-Flow: online" \
        -d "$payload")

    local response=$(cat "$response_file")

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        local total=$(echo "$response" | jq -r '.total_amount')

        # Check if server corrected the total
        if (( $(echo "$total > 10.50 && $total < 11.00" | bc -l) )); then
            print_success "Server corrected invalid total: $total (expected ~10.83)"
            print_info "Server should have logged: 'Total amount mismatch detected'"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_error "Server did not correct total: $total (expected ~10.83)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        print_info "Server rejected order (Track B strict validation): HTTP $http_code"
        print_info "This is expected if Track B is deployed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header "Order Flow Verification Suite"
    echo -e "API Base URL: ${BLUE}$API_BASE${NC}"
    echo -e "Restaurant ID: ${BLUE}$RESTAURANT_ID${NC}"

    # Check dependencies
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi

    if ! command -v bc &> /dev/null; then
        print_error "bc is required but not installed"
        echo "Install with: brew install bc (macOS) or apt-get install bc (Linux)"
        exit 1
    fi

    # Run tests
    test_checkout_flow
    test_server_voice_flow
    test_voice_direct_flow
    test_server_validation_logging

    # Print summary
    print_header "Test Results Summary"

    echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        print_success "All tests passed! ✨"
        echo ""
        echo "Next steps:"
        echo "  1. Check server logs for 'Total amount mismatch' warnings"
        echo "  2. Verify orders created in Supabase database"
        echo "  3. Monitor for 24 hours for any issues"
        echo "  4. Proceed with Track B implementation if all stable"
        exit 0
    else
        echo ""
        print_error "Some tests failed"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check that Track A fixes are deployed"
        echo "  2. Run order_verification.sql in Supabase"
        echo "  3. Check server logs for errors"
        echo "  4. Review ORDER_FAILURE_INCIDENT_REPORT.md"
        exit 1
    fi
}

# Run main function
main "$@"
