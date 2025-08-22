#!/usr/bin/env node

/**
 * Create practice orders for testing the Kitchen Display
 */

const API_URL = 'http://localhost:3001/api/v1';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Sample order configurations
const sampleOrders = [
  {
    items: [
      { name: 'Classic Burger', quantity: 2, price: 12.99, modifiers: [{ name: 'No onions' }, { name: 'Extra cheese' }] },
      { name: 'French Fries', quantity: 2, price: 4.99, modifiers: [] },
      { name: 'Coca Cola', quantity: 2, price: 2.99, modifiers: [{ name: 'No ice' }] }
    ],
    customer_name: 'John Smith',
    type: 'online'
  },
  {
    items: [
      { name: 'Caesar Salad', quantity: 1, price: 10.99, modifiers: [{ name: 'Add chicken' }, { name: 'Dressing on side' }] },
      { name: 'Iced Tea', quantity: 1, price: 2.99, modifiers: [] }
    ],
    customer_name: 'Sarah Johnson',
    type: 'pickup'
  },
  {
    items: [
      { name: 'Pizza Margherita', quantity: 1, price: 14.99, modifiers: [{ name: 'Extra mozzarella' }] },
      { name: 'Garlic Bread', quantity: 1, price: 5.99, modifiers: [] },
      { name: 'Sprite', quantity: 2, price: 2.99, modifiers: [] }
    ],
    customer_name: 'Mike Wilson',
    type: 'delivery'
  },
  {
    items: [
      { name: 'Fish & Chips', quantity: 1, price: 13.99, modifiers: [{ name: 'Extra tartar sauce' }] },
      { name: 'Coleslaw', quantity: 1, price: 3.99, modifiers: [] },
      { name: 'Lemonade', quantity: 1, price: 2.99, modifiers: [] }
    ],
    customer_name: 'Emily Brown',
    type: 'online'
  },
  {
    items: [
      { name: 'Chicken Wings', quantity: 12, price: 11.99, modifiers: [{ name: 'Buffalo sauce' }, { name: 'Ranch dip' }] },
      { name: 'Onion Rings', quantity: 1, price: 4.99, modifiers: [] },
      { name: 'Beer', quantity: 2, price: 4.99, modifiers: [] }
    ],
    customer_name: 'David Lee',
    type: 'pickup'
  },
  {
    items: [
      { name: 'Veggie Wrap', quantity: 1, price: 9.99, modifiers: [{ name: 'No tomatoes' }, { name: 'Add avocado' }] },
      { name: 'Sweet Potato Fries', quantity: 1, price: 5.99, modifiers: [] },
      { name: 'Orange Juice', quantity: 1, price: 3.99, modifiers: [] }
    ],
    customer_name: 'Lisa Chen',
    type: 'online'
  },
  {
    items: [
      { name: 'Steak Sandwich', quantity: 1, price: 15.99, modifiers: [{ name: 'Medium rare' }] },
      { name: 'Mashed Potatoes', quantity: 1, price: 4.99, modifiers: [] },
      { name: 'Red Wine', quantity: 1, price: 7.99, modifiers: [] }
    ],
    customer_name: 'Robert Taylor',
    type: 'delivery'
  },
  {
    items: [
      { name: 'Breakfast Burrito', quantity: 2, price: 8.99, modifiers: [{ name: 'Extra salsa' }] },
      { name: 'Hash Browns', quantity: 2, price: 3.99, modifiers: [] },
      { name: 'Coffee', quantity: 2, price: 2.99, modifiers: [{ name: 'Decaf' }] }
    ],
    customer_name: 'Jennifer White',
    type: 'pickup'
  }
];

async function getAuthToken() {
  try {
    const response = await fetch(`${API_URL}/auth/kiosk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: RESTAURANT_ID })
    });
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    process.exit(1);
  }
}

async function createOrder(token, orderData) {
  try {
    // Calculate total
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    const order = {
      restaurant_id: RESTAURANT_ID,
      items: orderData.items.map(item => ({
        ...item,
        id: 'item-' + Date.now() + Math.random().toString(36).substr(2, 5),
        menu_item_id: 'item-' + Date.now() + Math.random().toString(36).substr(2, 5)
      })),
      status: 'pending',
      type: orderData.type,
      customer_name: orderData.customer_name,
      customer_email: `${orderData.customer_name.toLowerCase().replace(' ', '.')}@example.com`,
      customer_phone: '555-' + Math.floor(Math.random() * 9000 + 1000),
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total_amount: Number(total.toFixed(2)),
      payment_status: 'paid',
      payment_method: 'credit_card',
      table_number: Math.floor(Math.random() * 20) + 1,
      notes: '',
      metadata: {
        uiType: orderData.type
      }
    };
    
    console.log('Sending order:', JSON.stringify({ subtotal: order.subtotal, tax: order.tax, total_amount: order.total_amount }));

    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create order: ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}

async function main() {
  console.log('🍔 Creating practice orders for Kitchen Display...\n');
  
  // Get auth token
  console.log('Getting authentication token...');
  const token = await getAuthToken();
  console.log('✓ Authentication successful\n');

  // Create orders with delays to simulate real traffic
  let successCount = 0;
  
  for (let i = 0; i < sampleOrders.length; i++) {
    const orderData = sampleOrders[i];
    console.log(`Creating order ${i + 1}/${sampleOrders.length} for ${orderData.customer_name}...`);
    
    const result = await createOrder(token, orderData);
    
    if (result) {
      successCount++;
      console.log(`✓ Order #${result.order_number || result.id} created successfully`);
    } else {
      console.log(`✗ Failed to create order for ${orderData.customer_name}`);
    }
    
    // Add delay between orders (0.5-1.5 seconds)
    if (i < sampleOrders.length - 1) {
      const delay = Math.random() * 1000 + 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`\n✅ Successfully created ${successCount}/${sampleOrders.length} practice orders!`);
  console.log('📺 Check the Kitchen Display at http://localhost:5173/kitchen');
}

// Run the script
main().catch(console.error);