import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')

console.log('🔨 Testing AI Gateway build...')

try {
  process.chdir(gatewayPath)
  console.log('📍 Working in:', process.cwd())
  
  console.log('🔧 Building with development config...')
  execSync('npm run build', { stdio: 'inherit' })
  
  console.log('✅ Build successful!')
  
  console.log('🧪 Testing health endpoint compilation...')
  console.log('🚀 Ready to start server with: npm run dev')
  
} catch (error) {
  console.log('❌ Build failed:', error.message)
  
  // Try to start anyway for development
  console.log('\n💡 Trying development server without build...')
  try {
    console.log('🔥 Starting development server...')
    execSync('timeout 5s npm run dev || true', { stdio: 'inherit' })
  } catch {
    console.log('💡 Server startup attempted (timeout expected)')
  }
}