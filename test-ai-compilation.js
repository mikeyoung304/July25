import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')

console.log('🔧 Testing AI Gateway TypeScript compilation...')

try {
  process.chdir(gatewayPath)
  console.log('📍 Changed to:', process.cwd())
  
  console.log('📦 Building TypeScript...')
  execSync('npm run build', { stdio: 'inherit' })
  
  console.log('✅ TypeScript compilation successful!')
  
  console.log('🧪 Testing basic server startup...')
  console.log('💡 Run: npm run dev to start the server')
  
} catch (error) {
  console.log('❌ Compilation failed:', error.message)
  
  // Try to fix common issues
  console.log('\n🔧 Attempting fixes...')
  
  try {
    console.log('📦 Reinstalling dependencies...')
    execSync('npm install', { stdio: 'inherit' })
    
    console.log('🔨 Trying build again...')
    execSync('npm run build', { stdio: 'inherit' })
    
    console.log('✅ Fixed! TypeScript compilation successful!')
  } catch (fixError) {
    console.log('❌ Could not fix automatically:', fixError.message)
    console.log('\n🔍 Manual debugging needed:')
    console.log('1. cd ../macon-ai-gateway')
    console.log('2. npm install')
    console.log('3. npm run build')
    console.log('4. Check for TypeScript errors')
  }
}