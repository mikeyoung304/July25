#!/usr/bin/env node
/**
 * Automated Console Log Cleanup Script
 * Replaces console.log/debug/info with logger service
 * Skips WebRTC files to avoid breaking duplicate bug
 */

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage'];
const SKIP_FILES = ['WebRTC', 'webrtc', '.test.', '.spec.'];

function shouldSkipFile(filePath) {
  // Skip WebRTC files
  for (const skip of SKIP_FILES) {
    if (filePath.toLowerCase().includes(skip.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true };
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let replacements = 0;

    // Count and replace console.log
    const logMatches = content.match(/console\.log\(/g);
    if (logMatches) {
      replacements += logMatches.length;
      content = content.replace(/console\.log\(/g, 'logger.info(');
    }

    // Count and replace console.debug
    const debugMatches = content.match(/console\.debug\(/g);
    if (debugMatches) {
      replacements += debugMatches.length;
      content = content.replace(/console\.debug\(/g, 'logger.debug(');
    }

    // Count and replace console.info
    const infoMatches = content.match(/console\.info\(/g);
    if (infoMatches) {
      replacements += infoMatches.length;
      content = content.replace(/console\.info\(/g, 'logger.info(');
    }

    if (replacements > 0) {
      // Add logger import if not present
      const hasLoggerImport = content.includes("from '@/services/logger'") || 
                             content.includes("from '../services/logger'");
      
      if (!hasLoggerImport) {
        const isClientFile = filePath.includes('/client/src/');
        const importStatement = isClientFile 
          ? "import { logger } from '@/services/logger'"
          : "import { logger } from '../services/logger'";
        
        // Add import after first import or at top
        const firstImportIndex = content.indexOf('import ');
        if (firstImportIndex !== -1) {
          const lineEnd = content.indexOf('\n', firstImportIndex);
          content = content.slice(0, lineEnd + 1) + importStatement + '\n' + content.slice(lineEnd + 1);
        } else {
          content = importStatement + '\n\n' + content;
        }
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      return { modified: true, replacements };
    }

    return { modified: false };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { error: true };
  }
}

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip certain directories
      if (!SKIP_DIRS.includes(file)) {
        walkDirectory(filePath, callback);
      }
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(filePath);
    }
  });
}

function cleanupConsoleLogs() {
  console.log('🧹 Starting console log cleanup...\n');

  let totalFiles = 0;
  let filesModified = 0;
  let totalReplacements = 0;
  let skippedFiles = 0;

  // Process client files
  const clientSrc = path.join(process.cwd(), 'client', 'src');
  if (fs.existsSync(clientSrc)) {
    walkDirectory(clientSrc, (filePath) => {
      totalFiles++;
      const result = processFile(filePath);
      
      if (result.skipped) {
        skippedFiles++;
      } else if (result.modified) {
        filesModified++;
        totalReplacements += result.replacements;
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✓ ${relativePath} (${result.replacements} replacements)`);
      }
    });
  }

  // Process server files
  const serverSrc = path.join(process.cwd(), 'server', 'src');
  if (fs.existsSync(serverSrc)) {
    walkDirectory(serverSrc, (filePath) => {
      totalFiles++;
      const result = processFile(filePath);
      
      if (result.skipped) {
        skippedFiles++;
      } else if (result.modified) {
        filesModified++;
        totalReplacements += result.replacements;
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✓ ${relativePath} (${result.replacements} replacements)`);
      }
    });
  }

  console.log('\n📊 Summary:');
  console.log(`- Files scanned: ${totalFiles}`);
  console.log(`- Files modified: ${filesModified}`);
  console.log(`- Total replacements: ${totalReplacements}`);
  console.log(`- Files skipped (WebRTC/tests): ${skippedFiles}`);
  console.log('\n✅ Console log cleanup complete!');
  console.log('Note: console.warn and console.error were preserved as per technical debt docs.');
}

// Run the cleanup
cleanupConsoleLogs();