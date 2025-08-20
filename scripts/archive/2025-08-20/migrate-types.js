#!/usr/bin/env node

/**
 * Migration script to update all property names from old format to shared types format
 * Old format (camelCase) -> New format (snake_case)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Property mappings from old to new
const propertyMappings = {
  // Order properties
  'orderNumber': 'order_number',
  'tableNumber': 'table_number',
  'totalAmount': 'total',
  'paymentStatus': 'payment_status',
  'orderTime': 'created_at',
  'completedTime': 'completed_at',
  'orderType': 'type',
  'customerId': 'customer_id',
  'customerName': 'customer_name',
  'customerPhone': 'customer_phone',
  'customerEmail': 'customer_email',
  'preparationTime': 'estimated_ready_time',
  
  // OrderItem properties
  'menuItemId': 'menu_item_id',
  'unitPrice': 'price',
  'specialInstructions': 'special_instructions',
  
  // MenuItem properties
  'imageUrl': 'image_url',
  'available': 'is_available',
  'categoryId': 'category_id',
  'prepTimeMinutes': 'preparation_time',
  
  // Table properties
  'tableId': 'id',
  'restaurantId': 'restaurant_id',
  'serverId': 'server_id',
  'currentOrderId': 'current_order_id',
  
  // Restaurant properties
  'logoUrl': 'logo_url',
  'taxRate': 'tax_rate',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at'
};

// Files to process
const filesToProcess = [
  'client/src/**/*.ts',
  'client/src/**/*.tsx',
  '!client/src/**/*.test.ts',
  '!client/src/**/*.test.tsx',
  '!client/src/**/*.spec.ts',
  '!client/src/**/*.spec.tsx',
  '!**/node_modules/**'
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Replace property access patterns
  Object.entries(propertyMappings).forEach(([oldProp, newProp]) => {
    // Replace object property access: .orderNumber -> .order_number
    const dotAccessRegex = new RegExp(`\\.${oldProp}(?![a-zA-Z0-9_])`, 'g');
    if (dotAccessRegex.test(content)) {
      content = content.replace(dotAccessRegex, `.${newProp}`);
      hasChanges = true;
    }
    
    // Replace object property definitions: orderNumber: -> order_number:
    const propDefRegex = new RegExp(`^(\\s*)${oldProp}:`, 'gm');
    if (propDefRegex.test(content)) {
      content = content.replace(propDefRegex, `$1${newProp}:`);
      hasChanges = true;
    }
    
    // Replace destructuring: { orderNumber } -> { order_number }
    const destructRegex = new RegExp(`{([^}]*?)\\b${oldProp}\\b`, 'g');
    if (destructRegex.test(content)) {
      content = content.replace(destructRegex, (match, before) => {
        return `{${before}${newProp}`;
      });
      hasChanges = true;
    }
    
    // Replace bracket notation: ['orderNumber'] -> ['order_number']
    const bracketRegex = new RegExp(`\\['${oldProp}'\\]`, 'g');
    if (bracketRegex.test(content)) {
      content = content.replace(bracketRegex, `['${newProp}']`);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔄 Starting type migration...\n');
  
  let totalFiles = 0;
  let updatedFiles = 0;
  
  filesToProcess.forEach(pattern => {
    const files = glob.sync(pattern, { absolute: true });
    files.forEach(file => {
      totalFiles++;
      if (updateFile(file)) {
        updatedFiles++;
      }
    });
  });
  
  console.log(`\n✨ Migration complete!`);
  console.log(`📊 Processed ${totalFiles} files, updated ${updatedFiles} files`);
}

// Run migration
main();