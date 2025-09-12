// Test script to verify kiosk authentication and order submission

async function testKioskAuth() {
  const BASE_URL = 'http://localhost:3001';
  const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
  
  console.log('🔐 Testing Kiosk Authentication...\n');
  
  try {
    // Step 1: Authenticate as kiosk
    console.log('1. Authenticating kiosk...');
    const authResponse = await fetch(`${BASE_URL}/api/v1/auth/kiosk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: RESTAURANT_ID })
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      throw new Error(`Auth failed: ${authResponse.status} - ${error}`);
    }
    
    const authData = await authResponse.json();
    console.log('✅ Authentication successful!');
    console.log('   Token expires in:', authData.expiresIn, 'seconds');
    console.log('   Token preview:', authData.token.substring(0, 50) + '...\n');
    
    // Step 2: Test order submission with token
    console.log('2. Testing order submission with kiosk token...');
    const orderData = {
      type: 'kiosk',
      items: [{
        menu_item_id: 'test-item-1',
        name: 'Test Item',
        quantity: 1,
        price: 9.99,
        modifiers: [],
        specialInstructions: ''
      }],
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '5551234567',
      notes: 'Test order from kiosk auth script',
      subtotal: 9.99,
      tax: 0.70,
      tip: 0,
      total_amount: 10.69
    };
    
    const orderResponse = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`,
        'x-restaurant-id': RESTAURANT_ID
      },
      body: JSON.stringify(orderData)
    });
    
    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.log('❌ Order submission failed:', orderResponse.status);
      console.log('   Error:', error);
      
      // Parse JWT to check claims
      const tokenParts = authData.token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\n📋 Token claims:');
      console.log('   Role:', payload.role);
      console.log('   Scopes:', payload.scope);
      console.log('   Restaurant:', payload.restaurant_id);
      console.log('   Subject:', payload.sub);
    } else {
      const order = await orderResponse.json();
      console.log('✅ Order created successfully!');
      console.log('   Order ID:', order.id);
      console.log('   Order Number:', order.order_number);
      console.log('   Status:', order.status);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testKioskAuth().then(() => {
  console.log('\n✨ Test completed!');
  process.exit(0);
});