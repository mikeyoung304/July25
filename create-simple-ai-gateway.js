import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gatewayPath = path.join(__dirname, '..', 'macon-ai-gateway')

console.log('🛠️  Creating simplified AI Gateway for immediate testing...')

// Create a simple working version without complex types
const simpleIndex = `/**
 * Simple AI Gateway for immediate testing
 */

const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

// Load environment
dotenv.config()

const app = express()

// CORS for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-ID']
}))

// Body parsing
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai_gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    expects_snake_case: true,
    endpoints: {
      health: '/health',
      ai_chat: '/api/v1/ai/chat',
      menu_upload: '/api/admin/restaurants/:id/menu'
    }
  })
})

// Detailed health check
app.get('/health/detailed', (req, res) => {
  const uptime = process.uptime()
  const memory = process.memoryUsage()
  
  res.json({
    status: 'ok',
    service: 'ai_gateway',
    uptime_seconds: Math.floor(uptime),
    memory_usage: {
      heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memory.heapTotal / 1024 / 1024)
    },
    environment: {
      node_version: process.version,
      node_env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3002
    },
    features: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
    }
  })
})

// Simple AI chat endpoint (mock for now)
app.post('/api/v1/ai/chat', (req, res) => {
  const { message, session_id } = req.body
  
  console.log('AI Chat request:', { message, session_id })
  
  // Mock response in snake_case as frontend expects
  res.json({
    response: \`Thank you for asking: "\${message}". The AI Gateway is working! This is a mock response until OpenAI integration is complete.\`,
    suggested_items: [
      {
        item_id: 'mock_item_1',
        item_name: 'Test Burger',
        price: 12.99
      }
    ],
    intent: 'mock_query',
    session_id: session_id,
    response_time_ms: 150,
    model_used: 'mock'
  })
})

// Simple menu upload endpoint
app.post('/api/admin/restaurants/:id/menu', (req, res) => {
  const restaurantId = req.params.id
  const menuData = req.body
  
  console.log(\`Menu upload for restaurant \${restaurantId}\`)
  console.log(\`Categories: \${menuData.menu_categories?.length || 0}\`)
  
  res.json({
    message: 'Menu uploaded successfully (mock)',
    restaurant_id: restaurantId,
    categories_count: menuData.menu_categories?.length || 0,
    uploaded_at: new Date().toISOString()
  })
})

// Start server
const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
  console.log(\`🚀 Simple AI Gateway running on port \${PORT}\`)
  console.log(\`📊 Health check: http://localhost:\${PORT}/health\`)
  console.log(\`🔗 Frontend CORS: \${process.env.FRONTEND_URL || 'http://localhost:5173'}\`)
  console.log(\`✅ Ready for integration testing!\`)
})
`

const simpleIndexPath = path.join(gatewayPath, 'src', 'simple.js')
fs.writeFileSync(simpleIndexPath, simpleIndex)

// Update package.json to add simple dev script
const packagePath = path.join(gatewayPath, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

packageJson.scripts['dev:simple'] = 'node src/simple.js'

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))

console.log('✅ Created simple AI Gateway at src/simple.js')
console.log('🚀 Start with: cd ../macon-ai-gateway && npm run dev:simple')
console.log('📝 This provides basic endpoints for immediate testing')
console.log('🔧 Full TypeScript version can be fixed later')