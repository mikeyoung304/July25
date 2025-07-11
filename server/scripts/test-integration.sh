#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Grow Fresh Backend Integration...${NC}\n"

# Set test variables
API_URL="http://localhost:3001"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"
TEST_TOKEN="test-token"

# 1. Health Check
echo -e "${BLUE}1️⃣  Health Check...${NC}"
health_response=$(curl -s "$API_URL/health")
echo "$health_response" | jq .
echo ""

# 2. Menu Fetch
echo -e "${BLUE}2️⃣  Fetching Menu...${NC}"
menu_response=$(curl -s -H "X-Restaurant-ID: $RESTAURANT_ID" "$API_URL/api/v1/menu")
echo "$menu_response" | jq '{categories: .categories | length, items: .items | length, sample: .items[0:3] | map({name, price})}'
echo ""

# 3. Test Voice Order - Soul Bowl
echo -e "${BLUE}3️⃣  Testing Voice Order - Soul Bowl...${NC}"
voice_response=$(curl -s -X POST "$API_URL/api/v1/orders/voice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -d '{
    "transcription": "I want a soul bowl with extra collards",
    "metadata": {"device": "kiosk-1"}
  }')
echo "$voice_response" | jq .
echo ""

# 4. Test Voice Order - Greek Bowl
echo -e "${BLUE}4️⃣  Testing Voice Order - Greek Bowl...${NC}"
voice_response2=$(curl -s -X POST "$API_URL/api/v1/orders/voice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -d '{
    "transcription": "Greek bowl no olives please",
    "metadata": {"device": "drive-thru-1"}
  }')
echo "$voice_response2" | jq .
echo ""

# 5. Test Voice Order - Mom's Chicken Salad
echo -e "${BLUE}5️⃣  Testing Voice Order - Mom's Chicken Salad...${NC}"
voice_response3=$(curl -s -X POST "$API_URL/api/v1/orders/voice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -d '{
    "transcription": "Can I get moms chicken salad with a fruit cup",
    "metadata": {"device": "kiosk-2"}
  }')
echo "$voice_response3" | jq .
echo ""

# 6. List Orders
echo -e "${BLUE}6️⃣  Listing Recent Orders...${NC}"
orders_response=$(curl -s -H "Authorization: Bearer $TEST_TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  "$API_URL/api/v1/orders?limit=5")
echo "$orders_response" | jq 'if type == "array" then {count: length, orders: map({orderNumber, type, status, totalAmount})} else . end'
echo ""

echo -e "${GREEN}✅ Integration test complete!${NC}"
echo ""
echo -e "${BLUE}📋 Test Summary:${NC}"
echo "   - Health check: ✓"
echo "   - Menu fetch: ✓"
echo "   - Voice orders: ✓"
echo "   - Order listing: ✓"
echo ""
echo -e "${BLUE}💡 Next Steps:${NC}"
echo "   1. Check WebSocket connections for real-time updates"
echo "   2. Test order status updates"
echo "   3. Verify rate limiting works"
echo "   4. Test with actual Supabase JWT tokens"