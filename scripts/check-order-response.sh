#!/bin/bash
# Check order creation response structure

BASE_URL="https://july25.onrender.com"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

# Get token
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/demo-session" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"server\", \"restaurantId\": \"${RESTAURANT_ID}\"}" | jq -r '.token')

# Create order and show full response
curl -s -X POST "$BASE_URL/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-restaurant-id: $RESTAURANT_ID" \
  -d '{
    "items": [{
      "menuItemId": "512c2255-5565-4380-9377-c1cd79270157",
      "quantity": 1,
      "name": "Test Burger",
      "price": 10.00
    }],
    "orderType": "dine_in",
    "source": "server"
  }' | jq '.'
