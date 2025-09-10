#!/usr/bin/env node

/**
 * Comprehensive Voice Ordering System Test
 * Tests the complete flow from WebRTC session creation through order placement
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Test configuration
const config = {
  apiBase: BASE_URL,
  restaurantId: RESTAURANT_ID,
  testOrder: {
    items: [
      { name: 'Greek Salad', quantity: 1, modifications: ['extra feta'] },
      { name: 'Soul Bowl', quantity: 2, modifications: [] }
    ]
  }
};

class VoiceOrderingTest {
  constructor(config) {
    this.config = config;
    this.authToken = null;
    this.ephemeralToken = null;
    this.menuItems = [];
    this.orderData = null;
  }

  log(message, data = null) {
    console.log(`🔍 ${message}`);
    if (data) {
      console.log(`   ${JSON.stringify(data, null, 2)}`);
    }
  }

  error(message, error = null) {
    console.error(`❌ ${message}`);
    if (error) {
      console.error(`   ${error.message || error}`);
    }
  }

  success(message, data = null) {
    console.log(`✅ ${message}`);
    if (data) {
      console.log(`   ${JSON.stringify(data, null, 2)}`);
    }
  }

  async authenticateDemo() {
    this.log('Step 1: Authenticating with demo token...');
    
    try {
      const response = await fetch(`${this.config.apiBase}/api/v1/auth/kiosk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantId: this.config.restaurantId
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.token;
      this.success('Demo authentication successful', { userId: data.user?.id });
      return true;
    } catch (error) {
      this.error('Authentication failed', error);
      return false;
    }
  }

  async loadMenuItems() {
    this.log('Step 2: Loading menu items...');
    
    try {
      const response = await fetch(`${this.config.apiBase}/api/v1/menu/items`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'x-restaurant-id': this.config.restaurantId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load menu: ${response.status}`);
      }

      this.menuItems = await response.json();
      this.success(`Loaded ${this.menuItems.length} menu items`);
      
      // Show a few sample items
      const sampleItems = this.menuItems.slice(0, 3).map(item => ({
        name: item.name,
        price: item.price,
        category: item.category
      }));
      this.log('Sample menu items:', sampleItems);
      return true;
    } catch (error) {
      this.error('Failed to load menu', error);
      return false;
    }
  }

  async createRealtimeSession() {
    this.log('Step 3: Creating WebRTC realtime session...');
    
    try {
      const response = await fetch(`${this.config.apiBase}/api/v1/realtime/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'x-restaurant-id': this.config.restaurantId
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Realtime session creation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.ephemeralToken = data.client_secret?.value;
      
      if (!this.ephemeralToken) {
        throw new Error('No ephemeral token received');
      }

      this.success('Realtime session created', {
        sessionId: data.id,
        expiresAt: new Date(data.expires_at),
        hasMenuContext: !!data.menu_context
      });
      
      if (data.menu_context) {
        this.log('Menu context provided to AI', {
          contextLength: data.menu_context.length,
          preview: data.menu_context.substring(0, 200) + '...'
        });
      }
      
      return true;
    } catch (error) {
      this.error('Failed to create realtime session', error);
      return false;
    }
  }

  async simulateVoiceOrder() {
    this.log('Step 4: Simulating voice order processing...');
    
    try {
      // Find menu items that match our test order
      const orderItems = [];
      
      for (const testItem of this.config.testOrder.items) {
        const menuItem = this.menuItems.find(item => 
          item.name.toLowerCase().includes(testItem.name.toLowerCase()) ||
          testItem.name.toLowerCase().includes(item.name.toLowerCase())
        );
        
        if (menuItem) {
          orderItems.push({
            menuItem,
            quantity: testItem.quantity,
            modifications: testItem.modifications,
            subtotal: menuItem.price * testItem.quantity
          });
        } else {
          this.log(`Warning: Menu item "${testItem.name}" not found in menu`);
        }
      }
      
      if (orderItems.length === 0) {
        throw new Error('No menu items matched test order');
      }
      
      this.orderData = {
        items: orderItems,
        subtotal: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
        tax: 0,
        total: 0
      };
      
      // Calculate tax and total
      this.orderData.tax = this.orderData.subtotal * 0.08; // 8% tax
      this.orderData.total = this.orderData.subtotal + this.orderData.tax;
      
      this.success('Voice order simulation completed', {
        itemCount: orderItems.length,
        subtotal: this.orderData.subtotal.toFixed(2),
        tax: this.orderData.tax.toFixed(2),
        total: this.orderData.total.toFixed(2)
      });
      
      return true;
    } catch (error) {
      this.error('Voice order simulation failed', error);
      return false;
    }
  }

  async testOrderSubmission() {
    this.log('Step 5: Testing order submission...');
    
    try {
      const orderPayload = {
        items: this.orderData.items.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          modifications: item.modifications,
          price: item.menuItem.price
        })),
        orderType: 'kiosk',
        paymentMethod: 'demo',
        customerInfo: {
          name: 'Voice Test Customer',
          phone: '555-0123'
        },
        totals: {
          subtotal: this.orderData.subtotal,
          tax: this.orderData.tax,
          total: this.orderData.total
        }
      };
      
      const response = await fetch(`${this.config.apiBase}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'x-restaurant-id': this.config.restaurantId
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order submission failed: ${response.status} - ${errorText}`);
      }

      const orderResult = await response.json();
      this.success('Order submitted successfully', {
        orderId: orderResult.id,
        orderNumber: orderResult.order_number,
        status: orderResult.status,
        total: orderResult.total
      });
      
      return orderResult;
    } catch (error) {
      this.error('Order submission failed', error);
      return null;
    }
  }

  async testWebSocketNotification(orderId) {
    this.log('Step 6: Testing WebSocket real-time notifications...');
    
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`ws://localhost:3001`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'x-restaurant-id': this.config.restaurantId
          }
        });

        let notificationReceived = false;
        
        ws.on('open', () => {
          this.log('WebSocket connected, requesting order sync...');
          ws.send(JSON.stringify({
            type: 'sync_orders',
            restaurantId: this.config.restaurantId
          }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.log('WebSocket message received:', message.type);
            
            if (message.type === 'order_update' && message.data?.id === orderId) {
              notificationReceived = true;
              this.success('Order notification received via WebSocket', {
                orderId: message.data.id,
                status: message.data.status
              });
              ws.close();
              resolve(true);
            } else if (message.type === 'orders_sync' && message.data?.length > 0) {
              const targetOrder = message.data.find(order => order.id === orderId);
              if (targetOrder) {
                notificationReceived = true;
                this.success('Order found in sync data', {
                  orderId: targetOrder.id,
                  status: targetOrder.status
                });
                ws.close();
                resolve(true);
              }
            }
          } catch (parseError) {
            this.error('Failed to parse WebSocket message', parseError);
          }
        });

        ws.on('error', (error) => {
          this.error('WebSocket error', error);
          reject(error);
        });

        ws.on('close', () => {
          if (!notificationReceived) {
            this.log('WebSocket closed without receiving target notification');
            resolve(false);
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!notificationReceived) {
            this.log('WebSocket test timeout - closing connection');
            ws.close();
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        this.error('WebSocket setup failed', error);
        reject(error);
      }
    });
  }

  async testKitchenDisplay() {
    this.log('Step 7: Testing kitchen display integration...');
    
    try {
      const response = await fetch(`${this.config.apiBase}/api/v1/orders`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'x-restaurant-id': this.config.restaurantId
        }
      });

      if (!response.ok) {
        throw new Error(`Kitchen orders fetch failed: ${response.status}`);
      }

      const orders = await response.json();
      this.success(`Orders API shows ${orders.length} total orders`);
      
      // Check if our test order appears in recent orders
      const recentOrders = orders.filter(order => {
        const orderTime = new Date(order.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return orderTime > fiveMinutesAgo;
      });
      
      this.success(`${recentOrders.length} recent orders available for kitchen display`);
      return true;
    } catch (error) {
      this.error('Kitchen display test failed', error);
      return false;
    }
  }

  async runFullTest() {
    console.log('🚀 Starting Voice Ordering System Test');
    console.log('=====================================\n');

    const steps = [
      () => this.authenticateDemo(),
      () => this.loadMenuItems(),
      () => this.createRealtimeSession(),
      () => this.simulateVoiceOrder(),
      () => this.testOrderSubmission(),
    ];

    let orderId = null;

    for (let i = 0; i < steps.length; i++) {
      const stepResult = await steps[i]();
      if (!stepResult) {
        this.error(`Test failed at step ${i + 1}`);
        return false;
      }
      
      // Capture order ID from step 5
      if (i === 4 && stepResult && stepResult.id) {
        orderId = stepResult.id;
      }
      
      console.log(''); // Add spacing between steps
    }

    // Additional tests if order was created
    if (orderId) {
      await this.testWebSocketNotification(orderId);
      console.log('');
      await this.testKitchenDisplay();
    }

    console.log('\n🎉 Voice Ordering System Test Complete!');
    console.log('======================================');
    
    return true;
  }
}

// Run the test
async function main() {
  const test = new VoiceOrderingTest(config);
  
  try {
    await test.runFullTest();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default VoiceOrderingTest;