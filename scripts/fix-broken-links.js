#!/usr/bin/env node

/**
 * Broken Link Auto-Fix
 *
 * Automatically fixes broken internal links in markdown documentation
 * by analyzing file locations and updating relative paths.
 *
 * Usage:
 *   node scripts/fix-broken-links.js [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run   Show what would be changed without writing
 *   --verbose   Show detailed progress
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');

let verbose = false;

/**
 * Build a map of all markdown files and their paths
 */
async function buildFileIndex() {
  const files = await glob('**/*.md', {
    cwd: ROOT,
    absolute: false,
    ignore: ['node_modules/**', '.git/**', '**/node_modules/**']
  });

  const index = new Map();

  files.forEach(file => {
    const basename = path.basename(file);
    const fullPath = path.join(ROOT, file);

    if (!index.has(basename)) {
      index.set(basename, []);
    }
    index.set(basename, [...index.get(basename), fullPath]);
  });

  if (verbose) {
    console.log(`📁 Indexed ${files.length} markdown files`);
  }

  return { index, allFiles: files.map(f => path.join(ROOT, f)) };
}

/**
 * Extract all markdown links from a file
 */
function extractLinks(content, filePath) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[1];
    const url = match[2];
    const startIndex = match.index;
    const fullMatch = match[0];

    // Skip external URLs, mailto, and anchor-only links
    if (url.match(/^https?:\/\//) || url.match(/^mailto:/) || url.match(/^#/)) {
      continue;
    }

    links.push({
      text,
      url,
      fullMatch,
      startIndex
    });
  }

  return links;
}

/**
 * Resolve a link target from the source file
 */
function resolveLinkTarget(sourceFile, linkUrl) {
  const sourceDir = path.dirname(sourceFile);
  const targetPath = linkUrl.split('#')[0]; // Remove anchor

  if (!targetPath) return null;

  // Handle absolute paths from project root
  if (targetPath.startsWith('/')) {
    return path.join(ROOT, targetPath);
  }

  // Handle relative paths
  return path.resolve(sourceDir, targetPath);
}

/**
 * Find the best match for a broken link
 */
function findBestMatch(brokenTarget, fileIndex, allFiles) {
  const basename = path.basename(brokenTarget);

  // First try exact filename match
  if (fileIndex.has(basename)) {
    const matches = fileIndex.get(basename);
    if (matches.length === 1) {
      return matches[0];
    }

    // Multiple files with same name - try to find closest match
    const brokenDir = path.dirname(brokenTarget).toLowerCase();
    for (const match of matches) {
      if (match.toLowerCase().includes(brokenDir)) {
        return match;
      }
    }

    // Return first match as fallback
    return matches[0];
  }

  // Try case-insensitive search
  for (const file of allFiles) {
    if (path.basename(file).toLowerCase() === basename.toLowerCase()) {
      return file;
    }
  }

  return null;
}

/**
 * Calculate relative path from source to target
 */
function calculateRelativePath(sourceFile, targetFile) {
  const sourceDirAbs = path.dirname(sourceFile);
  const targetAbs = targetFile;

  let relativePath = path.relative(sourceDirAbs, targetAbs);

  // Normalize path separators for markdown
  relativePath = relativePath.split(path.sep).join('/');

  // Ensure relative paths don't start without ./
  if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
    relativePath = './' + relativePath;
  }

  return relativePath;
}

/**
 * Fix broken links in a file
 */
async function fixLinksInFile(filePath, fileIndex, allFiles, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const links = extractLinks(content, filePath);

  let fixed = 0;
  let notFound = 0;
  let alreadyCorrect = 0;
  let newContent = content;
  const changes = [];

  for (const link of links) {
    const targetPath = resolveLinkTarget(filePath, link.url);

    if (!targetPath) continue;

    // Check if target exists
    if (fs.existsSync(targetPath)) {
      alreadyCorrect++;
      continue;
    }

    // Try to find the correct location
    const bestMatch = findBestMatch(targetPath, fileIndex, allFiles);

    if (bestMatch) {
      const newRelativePath = calculateRelativePath(filePath, bestMatch);

      // Preserve anchor if present
      const anchor = link.url.includes('#') ? '#' + link.url.split('#')[1] : '';
      const newUrl = newRelativePath + anchor;

      const newLink = `[${link.text}](${newUrl})`;

      changes.push({
        old: link.fullMatch,
        new: newLink,
        oldTarget: link.url,
        newTarget: newUrl
      });

      newContent = newContent.replace(link.fullMatch, newLink);
      fixed++;
    } else {
      notFound++;
      if (verbose) {
        console.log(`  ⚠️  Could not find: ${link.url}`);
      }
    }
  }

  // Write changes if not dry run
  if (!dryRun && fixed > 0) {
    fs.writeFileSync(filePath, newContent);
  }

  return {
    filePath,
    fixed,
    notFound,
    alreadyCorrect,
    changes
  };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  verbose = args.includes('--verbose');

  console.log('🔗 Broken Link Auto-Fix\n');

  // Build file index
  console.log('📚 Building file index...');
  const { index, allFiles } = await buildFileIndex();
  console.log(`   Found ${allFiles.length} markdown files\n`);

  // Find all markdown files in docs/
  console.log('🔍 Scanning documentation...');
  const docsFiles = await glob('**/*.md', {
    cwd: DOCS_DIR,
    absolute: true,
    ignore: ['archive/**', '**/node_modules/**']
  });
  console.log(`   Found ${docsFiles.length} files to check\n`);

  // Fix links in each file
  console.log('🔧 Fixing broken links...\n');
  let totalFixed = 0;
  let totalNotFound = 0;
  let filesModified = 0;

  for (const file of docsFiles) {
    const result = await fixLinksInFile(file, index, allFiles, dryRun);

    if (result.fixed > 0) {
      filesModified++;
      totalFixed += result.fixed;

      const relativePath = path.relative(ROOT, file);
      console.log(`✅ ${relativePath}`);
      console.log(`   Fixed ${result.fixed} link(s)`);

      if (verbose && result.changes.length > 0) {
        result.changes.forEach(change => {
          console.log(`   ${change.oldTarget} → ${change.newTarget}`);
        });
      }
      console.log();
    }

    totalNotFound += result.notFound;
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary\n');
  console.log(`Files modified: ${filesModified}`);
  console.log(`Links fixed: ${totalFixed}`);
  console.log(`Links not found: ${totalNotFound}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No files were modified');
    console.log('   Remove --dry-run flag to apply changes\n');
  } else if (totalFixed > 0) {
    console.log(`✅ Fixed ${totalFixed} broken link(s) across ${filesModified} file(s)\n`);
  } else {
    console.log('✅ No broken links found!\n');
  }

  return totalNotFound > 0 ? 1 : 0;
}

// Run
try {
  const code = await main();
  process.exit(code);
} catch (error) {
  console.error('❌ Error fixing links:', error.message);
  console.error(error.stack);
  process.exit(1);
}
