#!/usr/bin/env node

/**
 * Test script to verify AI Gateway integration
 * Runs from rebuild-6.0 directory but tests the AI Gateway
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 AI Gateway Integration Test')
console.log('===============================')

// Check if AI Gateway directory exists
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')
if (!fs.existsSync(gatewayPath)) {
  console.log('❌ AI Gateway directory not found at:', gatewayPath)
  process.exit(1)
}

console.log('✅ AI Gateway directory found')

// Check package.json exists
const packagePath = path.join(gatewayPath, 'package.json')
if (!fs.existsSync(packagePath)) {
  console.log('❌ package.json not found in AI Gateway')
  process.exit(1)
}

console.log('✅ package.json exists')

// Check .env exists
const envPath = path.join(gatewayPath, '.env')
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found in AI Gateway')
  process.exit(1)
}

console.log('✅ .env file exists')

// Read .env file to check configuration
try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const hasSupabase = envContent.includes('SUPABASE_URL=http://localhost:54321')
  const hasPort = envContent.includes('PORT=3002')
  
  if (hasSupabase && hasPort) {
    console.log('✅ Environment configured correctly')
  } else {
    console.log('⚠️  Environment may need adjustment')
  }
} catch (error) {
  console.log('⚠️  Could not read .env file')
}

// Check if we can access the gateway directory
console.log('\n📦 Testing AI Gateway Setup...')

// Create a script to run npm install and start the server
const installScript = `
cd "${gatewayPath}"
echo "📦 Installing dependencies..."
npm install --silent
echo "✅ Dependencies installed"

echo "🚀 Starting AI Gateway..."
timeout 10 npm run dev &
GATEWAY_PID=$!

echo "⏳ Waiting for server to start..."
sleep 3

echo "🧪 Testing health endpoint..."
if curl -s http://localhost:3002/health > /dev/null; then
  echo "✅ AI Gateway is responding!"
  curl -s http://localhost:3002/health | head -n 5
else
  echo "❌ AI Gateway not responding"
fi

echo "🛑 Stopping test server..."
kill $GATEWAY_PID 2>/dev/null || true
echo "✅ Test complete"
`

// Write and execute the test script
const scriptPath = path.join(__dirname, 'test-gateway.sh')
fs.writeFileSync(scriptPath, installScript)
fs.chmodSync(scriptPath, '755')

console.log('📝 Created test script:', scriptPath)
console.log('🏃 Running integration test...')

try {
  execSync(`bash "${scriptPath}"`, { 
    stdio: 'inherit',
    timeout: 60000 // 1 minute timeout
  })
  console.log('\n🎉 AI Gateway test completed!')
} catch (error) {
  console.log('\n❌ Test failed:', error.message)
  console.log('\nNext steps:')
  console.log('1. cd ../macon-ai-gateway')
  console.log('2. npm install')
  console.log('3. npm run dev')
  console.log('4. Test manually with: curl http://localhost:3002/health')
}

// Clean up
try {
  fs.unlinkSync(scriptPath)
} catch (error) {
  // Ignore cleanup errors
}

console.log('\n📋 Next Steps:')
console.log('1. Verify AI Gateway is running on port 3002')
console.log('2. Start frontend: npm run dev (should connect to AI Gateway)')
console.log('3. Upload sample menu via admin endpoint')
console.log('4. Test AI chat functionality')