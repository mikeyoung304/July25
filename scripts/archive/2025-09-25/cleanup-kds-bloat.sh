#!/bin/bash

# KDS Cleanup Script - Remove AI-generated bloat
# Based on industry research: These components don't exist in Toast/Square KDS

echo "🧹 Cleaning up KDS bloat..."
echo "Files to remove (AI over-engineering not found in industry KDS):"
echo ""

# List files to be removed
FILES_TO_REMOVE=(
  # Over-layered components (industry uses 1-2 layers, not 6)
  "client/src/modules/kitchen/components/AnimatedKDSOrderCard.tsx"
  "client/src/modules/kitchen/components/KDSOrderListItem.tsx"
  "client/src/modules/kitchen/components/KDSLayout.tsx"
  "client/src/components/orders/KDSOrderCard.tsx"
  "client/src/components/orders/BaseOrderCard.tsx"
  "client/src/components/orders/useOrderUrgency.ts"
  
  # Over-componentized order pieces
  "client/src/components/shared/order/OrderHeaders.tsx"
  "client/src/components/shared/order/OrderItemsList.tsx"
  "client/src/components/shared/order/OrderActions.tsx"
  
  # Complex hooks not in industry KDS
  "client/src/hooks/kitchen/useKitchenOrders.ts"
  "client/src/hooks/kitchen/useOrderFiltering.ts"
  
  # Debug panels (not in production KDS)
  "client/src/components/kitchen/KDSDebugPanel.tsx"
  
  # Complex filter panel (industry uses simple status toggle)
  "client/src/components/shared/filters/FilterPanel.tsx"
  "client/src/components/shared/filters/FilterPanel.test.tsx"
  
  # Old complex KitchenDisplay
  "client/src/pages/KitchenDisplay.tsx"
  
  # Complex OrdersGrid wrapper
  "client/src/components/kitchen/OrdersGrid.tsx"
  
  # KitchenHeader (integrated into main component now)
  "client/src/components/kitchen/KitchenHeader.tsx"
)

echo "Files to remove:"
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ⚠ $file (not found)"
  fi
done

echo ""
read -p "Remove these files? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
      rm "$file"
      echo "  Removed: $file"
    fi
  done
  
  echo ""
  echo "✅ KDS cleanup complete!"
  echo ""
  echo "Summary:"
  echo "- Removed 6-layer component architecture"
  echo "- Removed complex filtering system"
  echo "- Removed debug panels from production"
  echo "- Simplified to match industry standard (Toast/Square)"
  echo ""
  echo "New structure:"
  echo "- KitchenDisplaySimple.tsx (main component)"
  echo "- OrderCard.tsx (single card component)"
  echo ""
else
  echo "Cleanup cancelled"
fi