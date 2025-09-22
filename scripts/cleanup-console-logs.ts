#!/usr/bin/env node
/**
 * Automated Console Log Cleanup Script
 * Replaces console.log/debug/info with logger service
 * Skips WebRTC files to avoid breaking duplicate bug
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const SKIP_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  // Skip WebRTC files due to known duplicate bug
  '**/WebRTC*.ts',
  '**/WebRTC*.tsx',
  '**/webrtc*.ts',
  '**/webrtc*.tsx'
];

const CLIENT_LOGGER_IMPORT = "import { logger } from '@/services/logger'";
const SERVER_LOGGER_IMPORT = "import { logger } from '../services/logger'";

interface ReplacementRule {
  pattern: RegExp;
  replacement: string;
}

const REPLACEMENT_RULES: ReplacementRule[] = [
  // console.log -> logger.info
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info('
  },
  // console.debug -> logger.debug
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug('
  },
  // console.info -> logger.info
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info('
  }
  // Note: We keep console.warn and console.error as per TECHNICAL_DEBT.md
];

async function cleanupConsoleLogs() {

  // Find all TypeScript files
  const files = globSync('**/*.{ts,tsx}', {
    ignore: SKIP_PATTERNS,
    cwd: process.cwd()
  });

  let totalReplacements = 0;
  let filesModified = 0;
  const skippedFiles: string[] = [];

  for (const file of files) {
    const filePath = path.resolve(file);
    
    // Extra check for WebRTC files
    if (filePath.toLowerCase().includes('webrtc')) {
      skippedFiles.push(file);
      continue;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      let fileReplacements = 0;

      // Apply replacement rules
      for (const rule of REPLACEMENT_RULES) {
        const matches = content.match(rule.pattern);
        if (matches) {
          fileReplacements += matches.length;
          content = content.replace(rule.pattern, rule.replacement);
        }
      }

      if (fileReplacements > 0) {
        // Add logger import if not present
        const hasLoggerImport = content.includes("from '@/services/logger'") || 
                               content.includes("from '../services/logger'");
        
        if (!hasLoggerImport) {
          // Determine if client or server file
          const isClientFile = filePath.includes('/client/src/');
          const importStatement = isClientFile ? CLIENT_LOGGER_IMPORT : SERVER_LOGGER_IMPORT;
          
          // Add import after the first import statement or at the top
          const firstImportIndex = content.indexOf('import ');
          if (firstImportIndex !== -1) {
            const lineEnd = content.indexOf('\n', firstImportIndex);
            content = content.slice(0, lineEnd + 1) + importStatement + '\n' + content.slice(lineEnd + 1);
          } else {
            content = importStatement + '\n\n' + content;
          }
        }

        // Write the modified content
        fs.writeFileSync(filePath, content, 'utf-8');
        
        totalReplacements += fileReplacements;
        filesModified++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error);
    }
  }

  
  if (skippedFiles.length > 0) {
  }

}

// Run the cleanup
cleanupConsoleLogs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});