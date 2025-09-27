#!/bin/bash

# Server monitoring script
API_URL="https://july25.onrender.com"
CHECK_INTERVAL=30
MAX_ATTEMPTS=20  # 10 minutes max

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Monitoring server at ${API_URL}"
echo "Checking every ${CHECK_INTERVAL} seconds..."
echo ""

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
    timestamp=$(date +"%H:%M:%S")
    
    # Try health endpoint
    response=$(curl -s -w "\n%{http_code}" --max-time 5 "${API_URL}/api/v1/health" 2>/dev/null)
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${timestamp} ${GREEN}✅ SERVER IS UP!${NC}"
        echo "Response: $body"
        
        # Quick system check
        echo ""
        echo "Running quick diagnostics..."
        
        # Test auth
        auth_test=$(curl -s -X POST "${API_URL}/api/v1/auth/kiosk" \
            -H "Content-Type: application/json" \
            -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}' \
            --max-time 5 2>/dev/null)
        
        if echo "$auth_test" | grep -q "token"; then
            echo -e "${GREEN}✓ Auth endpoint working${NC}"
        else
            echo -e "${RED}✗ Auth endpoint issue${NC}"
        fi
        
        # Test menu
        menu_test=$(curl -s -w "\n%{http_code}" \
            -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
            "${API_URL}/api/v1/menu/categories" \
            --max-time 5 2>/dev/null | tail -1)
        
        if [ "$menu_test" = "200" ]; then
            echo -e "${GREEN}✓ Menu endpoint working${NC}"
        else
            echo -e "${RED}✗ Menu endpoint issue (HTTP $menu_test)${NC}"
        fi
        
        echo ""
        echo "🎉 Server is operational! Test the kiosk at:"
        echo "   https://july25-client.vercel.app/kiosk"
        exit 0
        
    elif [ "$http_code" = "000" ]; then
        echo -e "${timestamp} ${YELLOW}⏳ Server not responding (attempt $attempt/$MAX_ATTEMPTS)${NC}"
    else
        echo -e "${timestamp} ${RED}❌ Server error: HTTP $http_code${NC}"
        echo "Response: $body"
    fi
    
    if [ $attempt -lt $MAX_ATTEMPTS ]; then
        sleep $CHECK_INTERVAL
    fi
    
    attempt=$((attempt + 1))
done

echo ""
echo -e "${RED}❌ Server did not come up after 10 minutes${NC}"
echo "Check Render dashboard for deployment logs"
exit 1