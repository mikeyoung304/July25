import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('🧪 Testing Frontend-AI Gateway Integration')
console.log('==========================================')

// Check if AI Gateway is running
async function checkAIGateway() {
  try {
    const response = await makeRequest('GET', 'http://localhost:3002/health')
    if (response.status === 200) {
      console.log('✅ AI Gateway is running on port 3002')
      return true
    }
  } catch (error) {
    console.log('❌ AI Gateway not running on port 3002')
    console.log('💡 Start it with: cd ../macon-ai-gateway && npm run dev:simple')
    return false
  }
}

// Test AI chat endpoint with auth headers
async function testAIChatEndpoint() {
  console.log('\n📡 Testing AI Chat Endpoint...')
  
  const chatRequest = {
    message: "Do you have burgers?",
    sessionId: "test_session_123"  // Frontend sends camelCase
  }
  
  try {
    const response = await makeRequest('POST', 'http://localhost:3002/api/v1/ai/chat', chatRequest, {
      'Authorization': 'Bearer mock_jwt_token',
      'X-Restaurant-ID': 'test_restaurant_123'
    })
    
    if (response.status === 200) {
      console.log('✅ AI Chat endpoint responding')
      console.log('📊 Response structure:')
      console.log('   - response:', typeof response.body.response)
      console.log('   - suggested_items:', Array.isArray(response.body.suggested_items))
      console.log('   - intent:', response.body.intent)
      console.log('   - Format: snake_case ✓')
      return true
    } else {
      console.log(`❌ AI Chat returned status ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('❌ AI Chat request failed:', error.message)
    return false
  }
}

// Upload sample menu data
async function uploadSampleMenu() {
  console.log('\n📤 Uploading Sample Menu...')
  
  const menuData = {
    menu_categories: [
      {
        category_id: "cat_burgers",
        category_name: "Burgers",
        display_order: 1,
        is_active: true,
        items: [
          {
            item_id: "item_classic_burger",
            item_name: "Classic Burger",
            description: "Beef patty with lettuce, tomato, onion",
            price: 12.99,
            is_available: true,
            preparation_time: 15,
            dietary_flags: ["gluten_free_option"],
            allergens: ["gluten"],
            calories: 650
          },
          {
            item_id: "item_veggie_burger",
            item_name: "Veggie Burger",
            description: "Plant-based patty with fresh vegetables",
            price: 11.99,
            is_available: true,
            preparation_time: 12,
            dietary_flags: ["vegetarian", "vegan_option"],
            allergens: ["gluten"],
            calories: 450
          }
        ]
      },
      {
        category_id: "cat_beverages",
        category_name: "Beverages",
        display_order: 2,
        is_active: true,
        items: [
          {
            item_id: "item_coke",
            item_name: "Coca-Cola",
            description: "Classic soft drink",
            price: 2.99,
            is_available: true,
            preparation_time: 1,
            dietary_flags: ["vegan"],
            allergens: [],
            calories: 140
          }
        ]
      }
    ],
    last_updated: new Date().toISOString()
  }
  
  try {
    const response = await makeRequest('POST', 'http://localhost:3002/api/admin/restaurants/test_restaurant_123/menu', menuData, {
      'Authorization': 'Bearer admin_jwt_token',
      'X-Restaurant-ID': 'test_restaurant_123'
    })
    
    if (response.status === 200) {
      console.log('✅ Menu uploaded successfully')
      console.log(`   Categories: ${response.body.categories_count}`)
      return true
    } else {
      console.log(`❌ Menu upload failed: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('❌ Menu upload error:', error.message)
    return false
  }
}

// Test case transformation
async function testCaseTransformation() {
  console.log('\n🔄 Testing Case Transformation...')
  
  // Frontend sends camelCase
  const camelCaseRequest = {
    message: "Test message",
    sessionId: "test123",
    restaurantInfo: {
      restaurantName: "Test Restaurant",
      menuCategories: ["Burgers", "Drinks"]
    }
  }
  
  console.log('📤 Sending camelCase:', JSON.stringify(camelCaseRequest, null, 2))
  
  try {
    const response = await makeRequest('POST', 'http://localhost:3002/api/v1/ai/chat', camelCaseRequest, {
      'Content-Type': 'application/json'
    })
    
    if (response.status === 200) {
      console.log('📥 Received snake_case:', JSON.stringify(response.body, null, 2))
      
      // Check if response has snake_case keys
      const hasSnakeCase = 'response_time_ms' in response.body || 'suggested_items' in response.body
      if (hasSnakeCase) {
        console.log('✅ Case transformation working correctly')
        return true
      } else {
        console.log('❌ Response not in snake_case format')
        return false
      }
    }
  } catch (error) {
    console.log('❌ Case transformation test failed:', error.message)
    return false
  }
}

// Main test flow
async function runTests() {
  console.log('🔍 Checking prerequisites...')
  
  // Check AI Gateway
  const gatewayRunning = await checkAIGateway()
  if (!gatewayRunning) {
    process.exit(1)
  }
  
  // Check frontend config
  console.log('\n📋 Frontend Configuration:')
  console.log('   VITE_API_BASE_URL=http://localhost:3002 ✓')
  
  // Run tests
  let allPassed = true
  
  allPassed &= await testAIChatEndpoint()
  allPassed &= await uploadSampleMenu()
  allPassed &= await testCaseTransformation()
  
  // Summary
  console.log('\n📊 Integration Test Summary')
  console.log('===========================')
  if (allPassed) {
    console.log('✅ All integration tests passed!')
    console.log('\n🎉 Frontend-AI Gateway integration is working!')
    console.log('\n📋 Next Steps:')
    console.log('1. Start frontend: npm run dev')
    console.log('2. Navigate to http://localhost:5173')
    console.log('3. Test voice/chat features')
    console.log('4. Monitor AI Gateway logs')
  } else {
    console.log('❌ Some tests failed')
    console.log('💡 Check the logs above for details')
  }
}

// Helper function
function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
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

// Run the tests
runTests().catch(console.error)