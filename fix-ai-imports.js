import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')

console.log('🔧 Fixing AI Gateway import paths...')

// Install tsconfig-paths
try {
  const { execSync } = await import('child_process')
  console.log('📦 Installing tsconfig-paths...')
  execSync('npm install --save-dev tsconfig-paths', { 
    cwd: gatewayPath,
    stdio: 'inherit' 
  })
} catch (error) {
  console.log('⚠️  Could not install tsconfig-paths:', error.message)
}

// Update package.json to use tsconfig-paths
const packagePath = path.join(gatewayPath, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

packageJson.scripts.dev = 'nodemon --exec "ts-node -r tsconfig-paths/register -P tsconfig.dev.json" src/index.ts'

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
console.log('📝 Updated package.json with tsconfig-paths')

// Alternative: Convert to relative imports
const filesToConvert = [
  'src/index.ts',
  'src/routes/admin.ts',
  'src/routes/ai.ts',
  'src/routes/v1.ts',
  'src/routes/health.ts'
]

console.log('🔄 Converting @ imports to relative imports...')

for (const file of filesToConvert) {
  const filePath = path.join(gatewayPath, file)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - not found`)
    continue
  }
  
  console.log(`📝 Converting ${file}...`)
  
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Convert @ imports to relative imports based on file location
    if (file.startsWith('src/routes/')) {
      // Routes are in src/routes/, so go up one level
      content = content.replace(/@\/middleware\//g, '../middleware/')
      content = content.replace(/@\/services\//g, '../services/')
      content = content.replace(/@\/types\//g, '../types/')
    } else if (file === 'src/index.ts') {
      // Index is in src/, so direct relative
      content = content.replace(/@\/middleware\//g, './middleware/')
      content = content.replace(/@\/routes\//g, './routes/')
      content = content.replace(/@\/services\//g, './services/')
      content = content.replace(/@\/types\//g, './types/')
    }
    
    fs.writeFileSync(filePath, content)
    console.log(`✅ Converted ${file}`)
  } catch (error) {
    console.log(`❌ Error converting ${file}:`, error.message)
  }
}

console.log('✅ Import conversion complete!')
console.log('🚀 Try starting server: cd ../macon-ai-gateway && npm run dev')