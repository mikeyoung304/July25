#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const ANALYSIS_OUTPUT = path.join(__dirname, '..', 'docs', 'CODE_ANALYSIS.md');

// Metrics to track
const metrics = {
  components: [],
  hooks: [],
  services: [],
  duplicatePatterns: [],
  largeFiles: [],
  complexComponents: [],
  missingTests: [],
  typeIssues: [],
  unusedExports: []
};

// Analyze file size and complexity
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileInfo = {
    path: filePath.replace(SRC_DIR, ''),
    lines: lines.length,
    imports: [],
    exports: [],
    components: [],
    hooks: [],
    complexity: 0
  };

  // Count imports
  const importRegex = /^import\s+.+\s+from\s+['"](.+)['"]/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    fileInfo.imports.push(match[1]);
  }

  // Find React components
  const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)(?:\s*[:=]|\s*\()/g;
  while ((match = componentRegex.exec(content)) !== null) {
    fileInfo.components.push(match[1]);
  }

  // Find hooks
  const hookRegex = /(?:export\s+)?(?:const|function)\s+(use[A-Z]\w+)/g;
  while ((match = hookRegex.exec(content)) !== null) {
    fileInfo.hooks.push(match[1]);
  }

  // Calculate cyclomatic complexity (simplified)
  const complexityPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\?\s*.*\s*:/g, // ternary
    /\&\&/g,
    /\|\|/g
  ];

  complexityPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      fileInfo.complexity += matches.length;
    }
  });

  return fileInfo;
}

// Find duplicate code patterns
function findDuplicatePatterns(files) {
  const patterns = new Map();
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(SRC_DIR, file.path), 'utf8');
    
    // Look for common patterns
    const commonPatterns = [
      /const\s+\[loading,\s*setLoading\]\s*=\s*useState/g,
      /const\s+\[error,\s*setError\]\s*=\s*useState/g,
      /try\s*{\s*setLoading\(true\)/g,
      /catch\s*\(error\)\s*{\s*console\.error/g,
      /className\s*=\s*{cn\(/g
    ];

    commonPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        const key = `pattern_${index}`;
        if (!patterns.has(key)) {
          patterns.set(key, { pattern: pattern.toString(), files: [] });
        }
        patterns.get(key).files.push({ file: file.path, count: matches.length });
      }
    });
  });

  return Array.from(patterns.values()).filter(p => p.files.length > 2);
}

// Walk directory recursively
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
      callback(filePath);
    }
  });
}

// Main analysis
function analyzeCodebase() {
  const allFiles = [];
  
  // Collect all TypeScript files
  walkDir(SRC_DIR, (filePath) => {
    const fileInfo = analyzeFile(filePath);
    allFiles.push(fileInfo);
    
    // Track metrics
    if (fileInfo.lines > 200) {
      metrics.largeFiles.push(fileInfo);
    }
    
    if (fileInfo.complexity > 10) {
      metrics.complexComponents.push(fileInfo);
    }
    
    if (fileInfo.components.length > 0) {
      metrics.components.push(...fileInfo.components.map(c => ({
        name: c,
        file: fileInfo.path
      })));
    }
    
    if (fileInfo.hooks.length > 0) {
      metrics.hooks.push(...fileInfo.hooks.map(h => ({
        name: h,
        file: fileInfo.path
      })));
    }
  });

  // Find duplicate patterns
  metrics.duplicatePatterns = findDuplicatePatterns(allFiles);

  // Check for missing tests
  allFiles.forEach(file => {
    if (file.components.length > 0 || file.hooks.length > 0) {
      const testFile = file.path.replace(/\.(tsx?|jsx?)$/, '.test.$1');
      const testPath = path.join(SRC_DIR, testFile);
      if (!fs.existsSync(testPath)) {
        metrics.missingTests.push(file.path);
      }
    }
  });

  return metrics;
}

// Generate report
function generateReport(metrics) {
  const report = `# Code Analysis Report

Generated: ${new Date().toISOString()}

## Summary

- Total Components: ${metrics.components.length}
- Total Custom Hooks: ${metrics.hooks.length}
- Large Files (>200 lines): ${metrics.largeFiles.length}
- Complex Components (complexity >10): ${metrics.complexComponents.length}
- Files Missing Tests: ${metrics.missingTests.length}

## Large Files

These files exceed 200 lines and might benefit from splitting:

${metrics.largeFiles.map(f => `- \`${f.path}\` (${f.lines} lines, complexity: ${f.complexity})`).join('\n')}

## Complex Components

These components have high cyclomatic complexity:

${metrics.complexComponents.map(f => `- \`${f.path}\` (complexity: ${f.complexity})
  - Components: ${f.components.join(', ')}
  - Hooks: ${f.hooks.join(', ')}`).join('\n\n')}

## Duplicate Patterns

Common patterns found across multiple files:

${metrics.duplicatePatterns.map(p => `### Pattern: \`${p.pattern}\`
Found in ${p.files.length} files:
${p.files.map(f => `- \`${f.file}\` (${f.count} occurrences)`).join('\n')}`).join('\n\n')}

## Missing Tests

Components/hooks without test files:

${metrics.missingTests.map(f => `- \`${f}\``).join('\n')}

## Refactoring Recommendations

### 1. Extract Common Patterns
Based on duplicate patterns, consider creating:
- \`useLoadingState\` hook for loading/error state management
- \`AsyncButton\` component for buttons with loading states
- \`withErrorBoundary\` HOC usage in more components

### 2. Split Large Files
Consider breaking down:
${metrics.largeFiles.slice(0, 3).map(f => `- \`${f.path}\` into smaller, focused components`).join('\n')}

### 3. Reduce Complexity
Simplify complex components by:
- Extracting logic into custom hooks
- Breaking down into smaller components
- Using composition patterns

### 4. Improve Test Coverage
Priority files for testing:
${metrics.missingTests.slice(0, 5).map(f => `- \`${f}\``).join('\n')}

## Module Opportunities

Based on the analysis, these features could become independent modules:
- Order Management (${metrics.components.filter(c => c.name.includes('Order')).length} components)
- Filtering System (${metrics.components.filter(c => c.name.includes('Filter')).length} components)
- Sound System (standalone feature)
- Performance Monitoring (standalone feature)
`;

  fs.writeFileSync(ANALYSIS_OUTPUT, report);
  console.log(`Analysis complete! Report saved to: ${ANALYSIS_OUTPUT}`);
}

// Run analysis
console.log('Analyzing codebase...');
const results = analyzeCodebase();
generateReport(results);