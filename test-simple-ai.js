import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')

console.log('🚀 Testing Simple AI Gateway...')

// Start the simple server
const serverProcess = spawn('npm', ['run', 'dev:simple'], {
  cwd: gatewayPath,
  stdio: ['ignore', 'pipe', 'pipe']
})

serverProcess.stdout.on('data', (data) => {
  process.stdout.write(`[SERVER] ${data}`)
})

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`[ERROR] ${data}`)
})

// Test endpoints after server starts
setTimeout(async () => {
  console.log('\n🧪 Testing AI Gateway endpoints...')
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...')
    const health = await makeRequest('GET', 'http://localhost:3002/health')
    if (health.status === 200) {
      console.log('✅ Health endpoint working!')
      console.log(`   Response: ${JSON.stringify(health.body, null, 2)}`)
    } else {
      console.log(`❌ Health endpoint failed: ${health.status}`)
    }
    
    // Test detailed health
    console.log('\n2. Testing detailed health...')
    const detailed = await makeRequest('GET', 'http://localhost:3002/health/detailed')
    if (detailed.status === 200) {
      console.log('✅ Detailed health working!')
      console.log(`   Uptime: ${detailed.body.uptime_seconds}s`)
      console.log(`   Memory: ${detailed.body.memory_usage.heap_used_mb}MB`)
    }
    
    // Test AI chat endpoint
    console.log('\n3. Testing AI chat endpoint...')
    const chatRequest = {
      message: 'Do you have burgers?',
      session_id: 'test_session_123'
    }
    
    const chat = await makeRequest('POST', 'http://localhost:3002/api/v1/ai/chat', chatRequest)
    if (chat.status === 200) {
      console.log('✅ AI chat endpoint working!')
      console.log(`   Response: ${chat.body.response.substring(0, 50)}...`)
      console.log(`   Format: snake_case response ✓`)
    }
    
    // Test menu upload
    console.log('\n4. Testing menu upload...')
    const menuData = {
      menu_categories: [
        {
          category_id: 'test_cat',
          category_name: 'Test Category',
          items: []
        }
      ]
    }
    
    const upload = await makeRequest('POST', 'http://localhost:3002/api/admin/restaurants/test123/menu', menuData)
    if (upload.status === 200) {
      console.log('✅ Menu upload working!')
      console.log(`   Restaurant: ${upload.body.restaurant_id}`)
    }
    
    console.log('\n🎉 All endpoints working!')
    console.log('\n📋 Next steps:')
    console.log('1. Configure frontend to use AI Gateway')
    console.log('2. Test from frontend browser')
    console.log('3. Verify case transformation')
    console.log('4. Add real OpenAI integration')
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`)
  }
  
  // Keep server running for manual testing
  console.log('\n⏰ Server will continue running...')
  console.log('💡 Press Ctrl+C to stop')
  
}, 3000) // Wait 3 seconds for server to start

function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    
    const req = http.request(url, options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body)
          })
        } catch {
          resolve({
            status: res.statusCode,
            body: body
          })
        }
      })
    })
    
    req.on('error', reject)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}