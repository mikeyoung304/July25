#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts large images to WebP format for better compression
 * Reduces file sizes by 70-90% while maintaining quality
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');

// Configuration
const CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  formats: {
    webp: { quality: 85, effort: 6 },
    avif: { quality: 80, effort: 4 }
  },
  sizeThreshold: 100 * 1024, // 100KB
};

async function optimizeImage(inputPath) {
  try {
    const stats = await fs.stat(inputPath);
    
    // Skip if already small
    if (stats.size < CONFIG.sizeThreshold) {
      console.log(`⏭️  Skipping ${inputPath} (already optimized: ${(stats.size / 1024).toFixed(1)}KB)`);
      return;
    }

    const dir = path.dirname(inputPath);
    const filename = path.basename(inputPath, path.extname(inputPath));
    
    // Read image metadata
    const metadata = await sharp(inputPath).metadata();
    
    // Calculate resize dimensions if needed
    let resizeOptions = null;
    if (metadata.width > CONFIG.maxWidth || metadata.height > CONFIG.maxHeight) {
      resizeOptions = {
        width: CONFIG.maxWidth,
        height: CONFIG.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      };
    }

    // Create WebP version
    const webpPath = path.join(dir, `${filename}.webp`);
    const pipeline = sharp(inputPath);
    
    if (resizeOptions) {
      pipeline.resize(resizeOptions);
    }
    
    await pipeline
      .webp(CONFIG.formats.webp)
      .toFile(webpPath);
    
    // Get file sizes
    const originalSize = stats.size;
    const webpStats = await fs.stat(webpPath);
    const webpSize = webpStats.size;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    
    console.log(`✅ Optimized ${inputPath}`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`   WebP: ${(webpSize / 1024).toFixed(1)}KB (${savings}% smaller)`);
    
    // Optionally create AVIF for modern browsers (even better compression)
    if (process.argv.includes('--avif')) {
      const avifPath = path.join(dir, `${filename}.avif`);
      await sharp(inputPath)
        .resize(resizeOptions)
        .avif(CONFIG.formats.avif)
        .toFile(avifPath);
      
      const avifStats = await fs.stat(avifPath);
      console.log(`   AVIF: ${(avifStats.size / 1024).toFixed(1)}KB`);
    }
    
    return { originalSize, webpSize, savings: originalSize - webpSize };
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🖼️  Image Optimization Script');
  console.log('=============================\n');
  
  // Find all images
  const patterns = [
    'assets/**/*.{jpg,jpeg,png}',
    'client/public/**/*.{jpg,jpeg,png}',
    'client/src/**/*.{jpg,jpeg,png}'
  ];
  
  let allFiles = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: path.join(__dirname, '..'),
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
    allFiles = allFiles.concat(files);
  }
  
  console.log(`Found ${allFiles.length} image files\n`);
  
  // Process images
  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalSavings = 0;
  let processedCount = 0;
  
  for (const file of allFiles) {
    const result = await optimizeImage(file);
    if (result) {
      totalOriginal += result.originalSize;
      totalOptimized += result.webpSize;
      totalSavings += result.savings;
      processedCount++;
    }
  }
  
  // Summary
  console.log('\n=============================');
  console.log('📊 Optimization Summary:');
  console.log(`   Files processed: ${processedCount}`);
  console.log(`   Original total: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Optimized total: ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)}MB (${((totalSavings / totalOriginal) * 100).toFixed(1)}%)`);
  
  // Update instructions
  console.log('\n📝 Next Steps:');
  console.log('1. Update your components to use WebP with fallbacks:');
  console.log('   <picture>');
  console.log('     <source srcset="image.webp" type="image/webp" />');
  console.log('     <img src="image.jpg" alt="..." />');
  console.log('   </picture>');
  console.log('\n2. Or use a React component for automatic handling');
  console.log('\n3. Consider deleting original files after verification');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { optimizeImage };