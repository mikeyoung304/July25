#!/usr/bin/env node

/**
 * Fix common TypeScript type errors
 */

const fs = require('fs');
const path = require('path');

// Common property name fixes (snake_case to camelCase mappings)
const propertyMappings = {
  'order.orderNumber': 'order.order_number',
  'order.tableNumber': 'order.table_number', 
  'order.createdAt': 'order.created_at',
  'order.updatedAt': 'order.updated_at',
  'table.tableNumber': 'table.table_number',
  '.orderNumber': '.order_number',
  '.tableNumber': '.table_number',
  '.createdAt': '.created_at',
  '.updatedAt': '.updated_at'
};

// Files with known type issues
const filesToFix = [
  'client/src/services/websocket/orderUpdates.ts',
  'client/src/pages/components/SeatSelectionModal.tsx',
  'client/src/pages/KioskDemo.tsx',
  'client/src/modules/voice/services/orderIntegration.ts'
];

function fixPropertyNames(content) {
  let fixed = content;
  
  // Fix property access patterns
  for (const [wrong, correct] of Object.entries(propertyMappings)) {
    const regex = new RegExp(wrong.replace('.', '\\.'), 'g');
    fixed = fixed.replace(regex, correct);
  }
  
  // Fix VoiceOrder type issue - it should have 'type' property
  fixed = fixed.replace(
    /interface VoiceOrder\s*{([^}]+)}/g,
    (match, body) => {
      if (!body.includes('type:')) {
        body = body.trim() + '\n  type?: OrderType;';
      }
      return `interface VoiceOrder {${body}}`;
    }
  );
  
  // Fix Table type - ensure it has seats property
  fixed = fixed.replace(
    /interface Table\s*{([^}]+)}/g,
    (match, body) => {
      if (!body.includes('seats:')) {
        body = body.trim() + '\n  seats: number;';
      }
      return `interface Table {${body}}`;
    }
  );
  
  return fixed;
}

// Fix OrderType mismatches
function fixOrderTypes(content) {
  // Replace UI order types with database order types
  content = content.replace(
    /type:\s*['"](?:dine-in|takeout|drive-thru)['"]/g,
    (match) => {
      if (match.includes('dine-in')) return "type: 'online'";
      if (match.includes('takeout')) return "type: 'pickup'";
      if (match.includes('drive-thru')) return "type: 'delivery'";
      return match;
    }
  );
  
  return content;
}

let totalFixes = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let fixed = fixPropertyNames(content);
  fixed = fixOrderTypes(fixed);
  
  if (content !== fixed) {
    fs.writeFileSync(fullPath, fixed);
    
    // Count fixes
    const propertyFixes = (content.match(/\.(orderNumber|tableNumber|createdAt|updatedAt)/g) || []).length;
    const typeFixes = (content.match(/type:\s*['"](?:dine-in|takeout|drive-thru)['"]/g) || []).length;
    const total = propertyFixes + typeFixes;
    
    totalFixes += total;
  } else {
  }
});

