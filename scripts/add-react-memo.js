#!/usr/bin/env node

/**
 * Add React.memo to expensive components for performance optimization
 */

const fs = require('fs');
const path = require('path');

// Components that would benefit from React.memo
const componentsToMemoize = [
  'client/src/components/shared/order/OrderItemsList.tsx',
  'client/src/components/shared/filters/FilterPanel.tsx',
  'client/src/components/shared/lists/OrderItemRow.tsx',
  'client/src/components/orders/BaseOrderCard.tsx',
  'client/src/components/kitchen/OrdersGrid.tsx',
  'client/src/modules/filters/components/StatusFilter.tsx',
  'client/src/modules/filters/components/FilterBar.tsx',
  'client/src/modules/kitchen/components/KDSOrderCard.tsx',
  'client/src/modules/kitchen/components/KitchenDisplay.tsx',
  'client/src/modules/order-system/components/MenuItemCard.tsx',
  'client/src/modules/order-system/components/CategoryTabs.tsx',
  'client/src/modules/floor-plan/components/TableCard.tsx'
];

function addReactMemo(content, componentName) {
  // Check if already memoized
  if (content.includes('React.memo(') || content.includes('memo(')) {
    return { content, memoized: false };
  }
  
  // Import React and memo if not already imported
  let modified = content;
  const hasReactImport = content.includes("from 'react'");
  const hasMemoImport = content.includes('memo');
  
  if (!hasMemoImport && hasReactImport) {
    // Add memo to existing React import
    modified = modified.replace(
      /import\s+{([^}]+)}\s+from\s+['"]react['"]/,
      (match, imports) => {
        const importList = imports.split(',').map(i => i.trim());
        if (!importList.includes('memo')) {
          importList.push('memo');
        }
        return `import { ${importList.join(', ')} } from 'react'`;
      }
    );
  } else if (!hasReactImport) {
    // Add new import at the top
    modified = `import { memo } from 'react';\n` + modified;
  }
  
  // Find the component export and wrap with memo
  const patterns = [
    // export function ComponentName
    {
      regex: /export\s+function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g,
      replacement: (match, name) => {
        const memoized = `const ${name} = memo(function ${name}`;
        return match.replace(`export function ${name}`, memoized);
      },
      needsExport: true
    },
    // export const ComponentName = () =>
    {
      regex: /export\s+const\s+(\w+)\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,
      replacement: (match, name) => {
        return match.replace(`export const ${name}`, `export const ${name} = memo(`);
      },
      needsCloseParen: true
    },
    // export const ComponentName = function
    {
      regex: /export\s+const\s+(\w+)\s*=\s*function/g,
      replacement: (match, name) => {
        return match.replace(`export const ${name}`, `export const ${name} = memo(function`);
      },
      needsCloseParen: true
    }
  ];
  
  let memoized = false;
  for (const pattern of patterns) {
    if (pattern.regex.test(modified)) {
      modified = modified.replace(pattern.regex, pattern.replacement);
      
      if (pattern.needsExport) {
        // Add export at the end
        modified += `\n\nexport { ${componentName} };`;
      }
      
      if (pattern.needsCloseParen) {
        // Find the end of the component and add closing parenthesis
        // This is tricky - we'll add it before the last export or at the end
        const lastExportIndex = modified.lastIndexOf('\nexport');
        if (lastExportIndex > 0) {
          modified = modified.slice(0, lastExportIndex) + ');\n' + modified.slice(lastExportIndex);
        } else {
          modified += ');';
        }
      }
      
      memoized = true;
      break;
    }
  }
  
  return { content: modified, memoized };
}

let totalMemoized = 0;

componentsToMemoize.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const componentName = path.basename(filePath, '.tsx');
  
  const { content: modified, memoized } = addReactMemo(content, componentName);
  
  if (memoized) {
    fs.writeFileSync(fullPath, modified);
    console.log(`✅ Memoized ${componentName}`);
    totalMemoized++;
  } else {
    console.log(`⏭️  ${componentName} already memoized or couldn't be processed`);
  }
});

console.log(`\n📊 Total: Memoized ${totalMemoized} components for better performance`);