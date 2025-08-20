#!/usr/bin/env node

/**
 * Add useMemo and useCallback optimizations to components
 * Identifies expensive computations and event handlers that can be memoized
 */

const fs = require('fs');
const path = require('path');

// Files to optimize
const filesToOptimize = [
  'client/src/pages/KitchenDisplay.tsx',
  'client/src/pages/ServerDashboard.tsx',
  'client/src/pages/AdminDashboard.tsx',
  'client/src/pages/PerformanceDashboard.tsx',
  'client/src/modules/order-system/components/Cart.tsx',
  'client/src/modules/order-system/components/MenuSection.tsx'
];

function addHookOptimizations(content) {
  let modified = content;
  let optimizations = [];
  
  // 1. Add useMemo for expensive computations
  // Pattern: const something = items.filter/map/reduce
  const computationPattern = /const\s+(\w+)\s*=\s*([\w.]+)\.(filter|map|reduce|sort|find)\(/g;
  
  modified = modified.replace(computationPattern, (match, varName, array, method) => {
    // Check if it's inside a useMemo already
    const beforeMatch = modified.substring(Math.max(0, modified.indexOf(match) - 50), modified.indexOf(match));
    if (beforeMatch.includes('useMemo')) {
      return match;
    }
    
    // Check if it's in a useEffect or event handler (those are ok)
    if (beforeMatch.includes('=>') || beforeMatch.includes('function')) {
      return match;
    }
    
    optimizations.push(`useMemo for ${varName}`);
    
    // Find the end of the computation
    const startIdx = modified.indexOf(match);
    let depth = 0;
    let endIdx = startIdx + match.length;
    
    for (let i = endIdx; i < modified.length; i++) {
      if (modified[i] === '(') depth++;
      if (modified[i] === ')') depth--;
      if (depth === -1) {
        endIdx = i + 1;
        break;
      }
    }
    
    const computation = modified.substring(startIdx + `const ${varName} = `.length, endIdx);
    const dependencies = extractDependencies(computation);
    
    return `const ${varName} = useMemo(() => ${computation}, [${dependencies.join(', ')}])`;
  });
  
  // 2. Add useCallback for event handlers
  // Pattern: const handleSomething = () => or function handleSomething
  const handlerPattern = /const\s+(handle\w+)\s*=\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*=>/g;
  
  modified = modified.replace(handlerPattern, (match, handlerName) => {
    // Check if it's already wrapped
    const beforeMatch = modified.substring(Math.max(0, modified.indexOf(match) - 50), modified.indexOf(match));
    if (beforeMatch.includes('useCallback')) {
      return match;
    }
    
    optimizations.push(`useCallback for ${handlerName}`);
    
    // Find the function body
    const startIdx = modified.indexOf(match);
    let depth = 0;
    let endIdx = startIdx + match.length;
    let inBody = false;
    
    for (let i = endIdx; i < modified.length; i++) {
      if (modified[i] === '{') {
        depth++;
        inBody = true;
      }
      if (modified[i] === '}' && inBody) {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    
    const handler = modified.substring(startIdx + `const ${handlerName} = `.length, endIdx);
    const dependencies = extractDependencies(handler);
    
    return `const ${handlerName} = useCallback(${handler}, [${dependencies.join(', ')}])`;
  });
  
  // 3. Add imports if needed
  const hasUseMemo = modified.includes('useMemo');
  const hasUseCallback = modified.includes('useCallback');
  
  if ((hasUseMemo || hasUseCallback) && !content.includes('useMemo') && !content.includes('useCallback')) {
    const hooksToImport = [];
    if (hasUseMemo) hooksToImport.push('useMemo');
    if (hasUseCallback) hooksToImport.push('useCallback');
    
    if (modified.includes("from 'react'")) {
      modified = modified.replace(
        /import\s+{([^}]+)}\s+from\s+['"]react['"]/,
        (match, imports) => {
          const importList = imports.split(',').map(i => i.trim());
          hooksToImport.forEach(hook => {
            if (!importList.includes(hook)) {
              importList.push(hook);
            }
          });
          return `import { ${importList.join(', ')} } from 'react'`;
        }
      );
    }
  }
  
  return { content: modified, optimizations };
}

function extractDependencies(code) {
  // Extract variable names used in the code
  const deps = new Set();
  
  // Common patterns for dependencies
  const patterns = [
    /\b(props\.\w+)/g,
    /\b(state\.\w+)/g,
    /\b([a-z]\w+)(?:\.|\[)/g, // variables being accessed
    /\b(set[A-Z]\w+)/g, // setState functions
  ];
  
  patterns.forEach(pattern => {
    const matches = code.matchAll(pattern);
    for (const match of matches) {
      deps.add(match[1]);
    }
  });
  
  // Filter out JavaScript keywords and common globals
  const keywords = ['const', 'let', 'var', 'if', 'else', 'return', 'function', 'async', 'await', 'console', 'window', 'document'];
  
  return Array.from(deps).filter(dep => !keywords.includes(dep));
}

let totalOptimizations = 0;

filesToOptimize.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipping ${filePath} - file not found`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const { content: modified, optimizations } = addHookOptimizations(content);
  
  if (optimizations.length > 0) {
    fs.writeFileSync(fullPath, modified);
    console.log(`✅ Optimized ${path.basename(filePath)}: ${optimizations.join(', ')}`);
    totalOptimizations += optimizations.length;
  } else {
    console.log(`⏭️  ${path.basename(filePath)} - no optimizations needed`);
  }
});

console.log(`\n📊 Total: Added ${totalOptimizations} hook optimizations`);