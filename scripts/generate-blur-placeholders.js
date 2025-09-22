#!/usr/bin/env node

/**
 * Generate base64 blur placeholders for all menu images
 * These are tiny (10x10) versions that can be inlined for instant loading
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGE_DIR = path.join(__dirname, '../client/public/images/menu');
const OUTPUT_FILE = path.join(__dirname, '../client/src/data/imagePlaceholders.ts');

async function generateBlurPlaceholder(imagePath) {
  try {
    const buffer = await sharp(imagePath)
      .resize(10, 10, { fit: 'cover' })
      .blur(0.3)
      .jpeg({ quality: 50 })
      .toBuffer();
    
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`Failed to process ${imagePath}:`, error.message);
    return null;
  }
}

async function generateAllPlaceholders() {
  
  // Get all jpg files
  const files = fs.readdirSync(IMAGE_DIR)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg'));
  
  const placeholders = {};
  
  for (const file of files) {
    const filePath = path.join(IMAGE_DIR, file);
    const placeholder = await generateBlurPlaceholder(filePath);
    
    if (placeholder) {
      // Use filename without extension as key
      const key = file.replace(/\.(jpg|jpeg)$/i, '');
      placeholders[key] = placeholder;
    }
  }
  
  // Generate TypeScript file
  const tsContent = `// Auto-generated blur placeholders for menu images
// Generated: ${new Date().toISOString()}
// DO NOT EDIT - Run 'npm run generate:placeholders' to regenerate

export const IMAGE_PLACEHOLDERS: Record<string, string> = ${JSON.stringify(placeholders, null, 2)};

export function getPlaceholder(imagePath: string): string | undefined {
  if (!imagePath) return undefined;
  
  // Extract filename without extension
  const filename = imagePath.split('/').pop()?.replace(/\\.(jpg|jpeg)$/i, '');
  return filename ? IMAGE_PLACEHOLDERS[filename] : undefined;
}
`;
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, tsContent);
  
}

// Check if sharp is installed
try {
  require.resolve('sharp');
  generateAllPlaceholders().catch(console.error);
} catch (error) {
  const { execSync } = require('child_process');
  execSync('npm install --save-dev sharp', { stdio: 'inherit', cwd: path.join(__dirname, '../client') });
  generateAllPlaceholders().catch(console.error);
}