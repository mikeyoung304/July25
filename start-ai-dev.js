import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')

console.log('🚀 Starting AI Gateway in development mode...')

// Start the server process
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: gatewayPath,
  stdio: ['ignore', 'pipe', 'pipe']
})

serverProcess.stdout.on('data', (data) => {
  process.stdout.write(`[SERVER] ${data}`)
})

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`[ERROR] ${data}`)
})

// Wait for server to start and test it
setTimeout(async () => {
  console.log('\n🧪 Testing health endpoint...')
  
  try {
    const response = await makeRequest('GET', 'http://localhost:3002/health')
    if (response.status === 200) {
      console.log('✅ AI Gateway is running!')
      console.log(`📊 Response:`, JSON.stringify(response.body, null, 2))
      
      console.log('\n🔗 Available endpoints:')
      console.log('- Health: http://localhost:3002/health')
      console.log('- Detailed health: http://localhost:3002/health/detailed')
      console.log('- AI chat: POST http://localhost:3002/api/v1/ai/chat')
      console.log('- Menu upload: POST http://localhost:3002/api/admin/restaurants/{id}/menu')
      
      console.log('\n📋 Next steps:')
      console.log('1. Upload sample menu data')
      console.log('2. Test AI chat with frontend integration')
      console.log('3. Verify case transformation works')
      
    } else {
      console.log(`❌ Health check failed: ${response.status}`)
    }
  } catch (error) {
    console.log(`❌ Could not connect to server: ${error.message}`)
  }
  
  // Keep server running for 10 more seconds for manual testing
  console.log('\n⏰ Server will continue running for 10 seconds...')
  setTimeout(() => {
    console.log('🛑 Stopping server...')
    serverProcess.kill()
    process.exit(0)
  }, 10000)
  
}, 5000) // Wait 5 seconds for server to start

function makeRequest(method, url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
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
    req.end()
  })
}