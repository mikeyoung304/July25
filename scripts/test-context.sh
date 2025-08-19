#!/bin/bash

echo "Testing RestaurantContext issue..."
echo "================================="
echo ""
echo "1. Open http://localhost:5173/kitchen in your browser"
echo "2. Open Developer Console (F12)"
echo "3. Look for console logs starting with:"
echo "   - [restaurant-types] Created RestaurantContext"
echo "   - [RestaurantProvider] Mounting"
echo "   - [useRestaurant] Accessing context"
echo ""
echo "The logs will show if:"
echo "- Context is created with same ID in provider and hook"
echo "- Provider is mounting before hook tries to access"
echo "- Context value is properly set"
echo ""
echo "Press Ctrl+C to exit"

# Keep script running to show instructions
while true; do
  sleep 1
done