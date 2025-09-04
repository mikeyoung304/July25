#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const budgetPath = path.join(__dirname, '../config/performance-budget.json');
const distPath = path.join(__dirname, '../client/dist');

// Load performance budget
const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf-8'));

// Helper to convert size strings to bytes
function parseSize(sizeStr) {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  
  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 1);
}

// Helper to format bytes
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

// Get file size (with optional gzip compression)
function getFileSize(filePath, compress = false) {
  if (!fs.existsSync(filePath)) return 0;
  
  const content = fs.readFileSync(filePath);
  if (compress) {
    return gzipSync(content).length;
  }
  return content.length;
}

// Find files matching pattern
function findFiles(pattern) {
  const baseDir = pattern.includes('**') ? distPath : path.dirname(path.join(distPath, pattern));
  const filePattern = path.basename(pattern);
  
  if (!fs.existsSync(baseDir)) return [];
  
  const files = [];
  function walk(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && pattern.includes('**')) {
        walk(fullPath);
      } else if (stat.isFile()) {
        if (filePattern.includes('*')) {
          const regex = new RegExp(filePattern.replace(/\*/g, '.*'));
          if (regex.test(item)) {
            files.push(fullPath);
          }
        } else if (item === filePattern) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(baseDir);
  return files;
}

// Check bundle sizes
function checkBundles() {
  console.log(chalk.bold.blue('\n📊 Checking Bundle Sizes...\n'));
  
  let hasErrors = false;
  let hasWarnings = false;
  
  for (const bundle of budget.bundles) {
    const files = findFiles(bundle.path.replace('./client/dist/', ''));
    
    if (files.length === 0) {
      console.log(chalk.yellow(`⚠️  ${bundle.name}: No files found matching ${bundle.path}`));
      continue;
    }
    
    let totalSize = 0;
    for (const file of files) {
      totalSize += getFileSize(file, bundle.compression === 'gzip');
    }
    
    const maxSize = parseSize(bundle.maxSize);
    const percentage = ((totalSize / maxSize) * 100).toFixed(1);
    
    const status = totalSize <= maxSize ? '✅' : bundle.severity === 'error' ? '❌' : '⚠️';
    const color = totalSize <= maxSize ? 'green' : bundle.severity === 'error' ? 'red' : 'yellow';
    
    console.log(
      chalk[color](
        `${status} ${bundle.name}: ${formatSize(totalSize)} / ${bundle.maxSize} (${percentage}%)`
      )
    );
    
    if (totalSize > maxSize) {
      if (bundle.severity === 'error') {
        hasErrors = true;
      } else if (bundle.severity === 'warning') {
        hasWarnings = true;
      }
      
      // Show file breakdown
      for (const file of files) {
        const size = getFileSize(file, bundle.compression === 'gzip');
        console.log(chalk.gray(`   └─ ${path.basename(file)}: ${formatSize(size)}`));
      }
    }
  }
  
  // Summary
  console.log('\n' + chalk.bold('Summary:'));
  if (hasErrors) {
    console.log(chalk.red('❌ Bundle size check failed! Some bundles exceed error thresholds.'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow('⚠️  Bundle size check passed with warnings.'));
  } else {
    console.log(chalk.green('✅ All bundles are within size limits!'));
  }
}

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.log(chalk.yellow('⚠️  Build directory not found. Run "npm run build" first.'));
  process.exit(0);
}

// Run the check
checkBundles();