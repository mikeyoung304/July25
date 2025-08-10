#!/bin/bash

echo "🔄 Fixing property names across codebase..."

# Fix in all TypeScript files
find client/src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Skip test files
  if [[ "$file" == *".test."* ]] || [[ "$file" == *".spec."* ]]; then
    continue
  fi
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Fix Order properties
  sed -i '' 's/\.orderNumber/\.order_number/g' "$file"
  sed -i '' 's/orderNumber:/order_number:/g' "$file"
  sed -i '' 's/{orderNumber/{order_number/g' "$file"
  sed -i '' "s/'orderNumber'/'order_number'/g" "$file"
  sed -i '' 's/"orderNumber"/"order_number"/g' "$file"
  
  sed -i '' 's/\.tableNumber/\.table_number/g' "$file"
  sed -i '' 's/tableNumber:/table_number:/g' "$file"
  sed -i '' 's/{tableNumber/{table_number/g' "$file"
  sed -i '' "s/'tableNumber'/'table_number'/g" "$file"
  sed -i '' 's/"tableNumber"/"table_number"/g' "$file"
  
  sed -i '' 's/\.totalAmount/\.total/g' "$file"
  sed -i '' 's/totalAmount:/total:/g' "$file"
  sed -i '' 's/{totalAmount/{total/g' "$file"
  sed -i '' "s/'totalAmount'/'total'/g" "$file"
  sed -i '' 's/"totalAmount"/"total"/g' "$file"
  
  sed -i '' 's/\.paymentStatus/\.payment_status/g' "$file"
  sed -i '' 's/paymentStatus:/payment_status:/g' "$file"
  sed -i '' 's/{paymentStatus/{payment_status/g' "$file"
  sed -i '' "s/'paymentStatus'/'payment_status'/g" "$file"
  sed -i '' 's/"paymentStatus"/"payment_status"/g' "$file"
  
  sed -i '' 's/\.orderTime/\.created_at/g' "$file"
  sed -i '' 's/orderTime:/created_at:/g' "$file"
  sed -i '' 's/{orderTime/{created_at/g' "$file"
  sed -i '' "s/'orderTime'/'created_at'/g" "$file"
  sed -i '' 's/"orderTime"/"created_at"/g' "$file"
  
  sed -i '' 's/\.completedTime/\.completed_at/g' "$file"
  sed -i '' 's/completedTime:/completed_at:/g' "$file"
  sed -i '' 's/{completedTime/{completed_at/g' "$file"
  sed -i '' "s/'completedTime'/'completed_at'/g" "$file"
  sed -i '' 's/"completedTime"/"completed_at"/g' "$file"
  
  sed -i '' 's/\.preparationTime/\.estimated_ready_time/g' "$file"
  sed -i '' 's/preparationTime:/estimated_ready_time:/g' "$file"
  sed -i '' 's/{preparationTime/{estimated_ready_time/g' "$file"
  sed -i '' "s/'preparationTime'/'estimated_ready_time'/g" "$file"
  sed -i '' 's/"preparationTime"/"estimated_ready_time"/g' "$file"
  
  sed -i '' 's/\.orderType/\.type/g' "$file"
  sed -i '' 's/orderType:/type:/g' "$file"
  sed -i '' 's/{orderType/{type/g' "$file"
  sed -i '' "s/'orderType'/'type'/g" "$file"
  sed -i '' 's/"orderType"/"type"/g' "$file"
  
  # Fix OrderItem properties  
  sed -i '' 's/\.menuItemId/\.menu_item_id/g' "$file"
  sed -i '' 's/menuItemId:/menu_item_id:/g' "$file"
  sed -i '' 's/{menuItemId/{menu_item_id/g' "$file"
  
  sed -i '' 's/\.specialInstructions/\.special_instructions/g' "$file"
  sed -i '' 's/specialInstructions:/special_instructions:/g' "$file"
  sed -i '' 's/{specialInstructions/{special_instructions/g' "$file"
  
  # Fix MenuItem properties
  sed -i '' 's/\.imageUrl/\.image_url/g' "$file"
  sed -i '' 's/imageUrl:/image_url:/g' "$file"
  sed -i '' 's/{imageUrl/{image_url/g' "$file"
  
  sed -i '' 's/\.available/\.is_available/g' "$file"
  sed -i '' 's/available:/is_available:/g' "$file"
  sed -i '' 's/{available/{is_available/g' "$file"
  
  sed -i '' 's/\.categoryId/\.category_id/g' "$file"
  sed -i '' 's/categoryId:/category_id:/g' "$file"
  sed -i '' 's/{categoryId/{category_id/g' "$file"
  
  # Check if file changed
  if diff -q "$file" "$file.bak" > /dev/null; then
    rm "$file.bak"
  else
    echo "✅ Updated: $file"
    rm "$file.bak"
  fi
done

echo "✨ Property name fixes complete!"