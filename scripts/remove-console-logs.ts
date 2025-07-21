#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

// Files to process
const PATTERNS = [
  'client/src/**/*.{ts,tsx}',
  'server/src/**/*.{ts,tsx}',
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  '**/test-utils/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
];

// Pattern to match console statements
const CONSOLE_REGEX = /console\.(log|warn|error|debug|info|trace)\s*\([^)]*\);?/g;

// Pattern to match debug-related code
const DEBUG_PATTERNS = [
  /\/\/\s*DEBUG:.*$/gm,
  /\/\/\s*TODO:.*debug.*$/gmi,
  /\/\/\s*TEMP:.*$/gm,
];

async function processFile(filePath: string): Promise<number> {
  let content = await fs.readFile(filePath, 'utf-8');
  const originalContent = content;
  let removedCount = 0;

  // Special handling for certain files
  const fileName = path.basename(filePath);
  
  // Don't remove from logger files or test utilities
  if (fileName.includes('logger') || fileName.includes('Logger')) {
    return 0;
  }

  // Replace console statements with proper logging
  content = content.replace(CONSOLE_REGEX, (match, method) => {
    removedCount++;
    
    // For error cases, we might want to keep them but use proper error handling
    if (method === 'error') {
      // Check if it's in a catch block or error handler
      const lines = originalContent.split('\n');
      const matchLine = lines.findIndex(line => line.includes(match));
      
      if (matchLine > 0) {
        const prevLines = lines.slice(Math.max(0, matchLine - 5), matchLine);
        const isInCatch = prevLines.some(line => line.includes('catch') || line.includes('error'));
        
        if (isInCatch) {
          // Replace with comment to review later
          return `// TODO: Replace with proper error handling`;
        }
      }
    }
    
    // For warnings in development checks, keep them but properly guard
    if (method === 'warn' && match.includes('Mock:')) {
      return match; // Keep mock warnings
    }
    
    // Remove other console statements
    return '';
  });

  // Clean up empty lines left after removal
  content = content.replace(/^\s*\n/gm, '');
  
  // Remove debug comments
  DEBUG_PATTERNS.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // Only write if changes were made
  if (content !== originalContent) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✓ Cleaned ${filePath} (removed ${removedCount} console statements)`);
  }

  return removedCount;
}

async function main() {
  console.log('🧹 Removing console logs and debug code...\n');

  const files = await glob(PATTERNS, {
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  });

  console.log(`Found ${files.length} files to process\n`);

  let totalRemoved = 0;
  
  for (const file of files) {
    const removed = await processFile(file);
    totalRemoved += removed;
  }

  console.log(`\n✅ Complete! Removed ${totalRemoved} console statements total.`);
  console.log('\nNext steps:');
  console.log('1. Review changes with: git diff');
  console.log('2. Run tests to ensure nothing broke: npm test');
  console.log('3. Consider adding a proper logging service');
}

main().catch(console.error);