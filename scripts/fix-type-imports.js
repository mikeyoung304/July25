#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', { absolute: true });

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Replace type imports that need to be fixed
  const typeImportPatterns = [
    // Pattern for imports with types mixed with values
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g
  ];

  content = content.replace(typeImportPatterns[0], (match, imports, module) => {
    const importItems = imports.split(',').map(item => item.trim());
    const typeImports = [];
    const valueImports = [];

    // Common type-only imports
    const knownTypes = [
      'ReactNode', 'ErrorInfo', 'ButtonProps', 'CardProps', 'Toast', 'ToastOptions',
      'StationType', 'Order', 'OrderItem', 'OrderStatus', 'OrderFilters', 'OrderEvent',
      'MenuItem', 'Table', 'IOrderService', 'IOrderHistoryService', 'ITableService',
      'IMenuService', 'IOrderStatisticsService', 'OrderHistoryParams', 'DateRangeParams',
      'OrderStatistics', 'Station', 'StationAssignment', 'FilterOption', 'OrderFilterState',
      'MicrophonePermissionStatus', 'KioskVoiceCaptureState'
    ];

    importItems.forEach(item => {
      // Check if it's a type import
      if (knownTypes.some(type => item.includes(type))) {
        typeImports.push(item);
      } else {
        valueImports.push(item);
      }
    });

    if (typeImports.length > 0 && valueImports.length > 0) {
      modified = true;
      // Split into two imports
      let result = '';
      if (valueImports.length > 0) {
        result += `import { ${valueImports.join(', ')} } from '${module}'`;
      }
      if (typeImports.length > 0) {
        if (result) result += '\n';
        result += `import type { ${typeImports.join(', ')} } from '${module}'`;
      }
      return result;
    } else if (typeImports.length > 0 && valueImports.length === 0) {
      modified = true;
      return `import type { ${typeImports.join(', ')} } from '${module}'`;
    }
    
    return match;
  });

  // Fix re-exports
  content = content.replace(/export\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g, (match, exports, module) => {
    const exportItems = exports.split(',').map(item => item.trim());
    const typeExports = [];
    const valueExports = [];

    const knownTypes = ['Order', 'OrderItem', 'OrderStatus'];

    exportItems.forEach(item => {
      if (knownTypes.some(type => item.includes(type))) {
        typeExports.push(item);
      } else {
        valueExports.push(item);
      }
    });

    if (typeExports.length > 0 && valueExports.length === 0) {
      modified = true;
      return `export type { ${typeExports.join(', ')} } from '${module}'`;
    }
    
    return match;
  });

  if (modified) {
    fs.writeFileSync(file, content);
  }
});

