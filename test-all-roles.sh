#!/bin/bash

# Test authentication and role persistence for all demo users

echo "Testing authentication roles..."
echo "================================"

RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

test_user() {
  local email=$1
  local role=$2
  
  echo ""
  echo "Testing $email (expected role: $role)"
  echo "--------------------------------------"
  
  # Login and get the response
  response=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"Demo123!\",
      \"restaurantId\": \"$RESTAURANT_ID\"
    }")
  
  # Extract role from response
  actual_role=$(echo "$response" | jq -r '.user.role')
  token=$(echo "$response" | jq -r '.session.access_token')
  
  if [ "$actual_role" = "$role" ]; then
    echo "✅ Login successful - Role: $actual_role"
  else
    echo "❌ Login failed - Expected: $role, Got: $actual_role"
  fi
  
  # Test /auth/me endpoint with the token
  if [ ! -z "$token" ] && [ "$token" != "null" ]; then
    me_response=$(curl -s http://localhost:3001/api/v1/auth/me \
      -H "Authorization: Bearer $token" \
      -H "X-Restaurant-ID: $RESTAURANT_ID")
    
    me_role=$(echo "$me_response" | jq -r '.user.role')
    
    if [ "$me_role" = "$role" ]; then
      echo "✅ /auth/me successful - Role: $me_role"
    else
      echo "❌ /auth/me failed - Expected: $role, Got: $me_role"
    fi
  fi
}

# Test all demo users
test_user "manager@restaurant.com" "manager"
test_user "server@restaurant.com" "server"
test_user "kitchen@restaurant.com" "kitchen"
test_user "expo@restaurant.com" "expo"
test_user "cashier@restaurant.com" "cashier"

echo ""
echo "================================"
echo "Testing complete!"
echo ""
echo "Next steps:"
echo "1. Clear browser localStorage: localStorage.clear()"
echo "2. Login with each user in the browser"
echo "3. Check the role displayed in the UI"
echo "4. Navigate to different pages to ensure role persists"