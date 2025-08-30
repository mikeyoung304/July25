/**
 * Payment Load Testing Script
 * Tests payment processing capacity with concurrent users
 * Target: 100 concurrent users, <500ms p95 response time, >95% success rate
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const paymentDuration = new Trend('payment_duration');
const paymentSuccess = new Rate('payment_success_rate');
const paymentFailures = new Counter('payment_failures');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '3m', target: 100 },   // Stay at 100 users (peak load)
    { duration: '2m', target: 50 },    // Scale down to 50
    { duration: '1m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    payment_success_rate: ['rate>0.95'], // Payment success rate over 95%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const RESTAURANT_ID = __ENV.RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

// Sample menu items for order creation
const menuItems = [
  { id: '1', name: 'Burger', price: 12.99, category: 'mains' },
  { id: '2', name: 'Pizza', price: 15.99, category: 'mains' },
  { id: '3', name: 'Salad', price: 8.99, category: 'salads' },
  { id: '4', name: 'Fries', price: 4.99, category: 'sides' },
  { id: '5', name: 'Soda', price: 2.99, category: 'drinks' },
];

// Payment test cards (Square Sandbox)
const testCards = [
  { number: '4111111111111111', cvv: '111', exp: '12/25' }, // Visa
  { number: '5105105105105100', cvv: '111', exp: '12/25' }, // Mastercard
  { number: '378282246310005', cvv: '1111', exp: '12/25' }, // Amex
];

function generateOrder() {
  const items = [];
  const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
  
  for (let i = 0; i < itemCount; i++) {
    const item = randomItem(menuItems);
    items.push({
      menu_item_id: item.id,
      name: item.name,
      quantity: Math.floor(Math.random() * 2) + 1, // 1-2 quantity
      price: item.price,
      modifiers: [],
    });
  }
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  
  return {
    type: 'online',
    items,
    customerName: `LoadTest User ${__VU}`,
    customerEmail: `loadtest${__VU}@example.com`,
    customerPhone: '5551234567',
    notes: 'Load test order',
    subtotal,
    tax,
    tip: 0,
    total_amount: total,
  };
}

function generatePaymentToken() {
  // In real scenario, this would use Square Web Payments SDK
  // For load testing, we simulate with a mock token
  return `test-payment-token-${__VU}-${Date.now()}`;
}

export default function() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-Restaurant-ID': RESTAURANT_ID,
  };
  
  // Step 1: Create an order
  const orderPayload = generateOrder();
  const orderResponse = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify(orderPayload),
    { headers, tags: { name: 'CreateOrder' } }
  );
  
  const orderSuccess = check(orderResponse, {
    'order created': (r) => r.status === 200 || r.status === 201,
    'order has ID': (r) => JSON.parse(r.body).id !== undefined,
  });
  
  if (!orderSuccess) {
    paymentFailures.add(1);
    return;
  }
  
  const order = JSON.parse(orderResponse.body);
  
  // Small delay between order and payment (simulating user entering card)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
  
  // Step 2: Process payment
  const paymentPayload = {
    orderId: order.id,
    token: generatePaymentToken(),
    amount: order.total_amount || orderPayload.total_amount,
    idempotencyKey: `load-test-${__VU}-${__ITER}-${Date.now()}`,
  };
  
  const paymentStart = Date.now();
  const paymentResponse = http.post(
    `${BASE_URL}/api/v1/payments/create`,
    JSON.stringify(paymentPayload),
    { headers, tags: { name: 'ProcessPayment' } }
  );
  const paymentEnd = Date.now();
  
  // Record custom metrics
  paymentDuration.add(paymentEnd - paymentStart);
  
  const paymentCheck = check(paymentResponse, {
    'payment processed': (r) => r.status === 200,
    'payment successful': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
    'has payment ID': (r) => {
      const body = JSON.parse(r.body);
      return body.paymentId !== undefined;
    },
  });
  
  if (paymentCheck) {
    paymentSuccess.add(1);
  } else {
    paymentSuccess.add(0);
    paymentFailures.add(1);
    console.error(`Payment failed for order ${order.id}: ${paymentResponse.status} - ${paymentResponse.body}`);
  }
  
  // Optional: Test payment status check
  if (paymentCheck && Math.random() < 0.1) { // 10% of successful payments
    const payment = JSON.parse(paymentResponse.body);
    sleep(1);
    
    const statusResponse = http.get(
      `${BASE_URL}/api/v1/payments/${payment.paymentId}`,
      { headers, tags: { name: 'CheckPaymentStatus' } }
    );
    
    check(statusResponse, {
      'status check successful': (r) => r.status === 200,
    });
  }
  
  // Optional: Test refund (very small percentage)
  if (paymentCheck && Math.random() < 0.01) { // 1% of successful payments
    const payment = JSON.parse(paymentResponse.body);
    sleep(2);
    
    const refundPayload = {
      reason: 'Load test refund',
    };
    
    const refundResponse = http.post(
      `${BASE_URL}/api/v1/payments/${payment.paymentId}/refund`,
      JSON.stringify(refundPayload),
      { headers, tags: { name: 'ProcessRefund' } }
    );
    
    check(refundResponse, {
      'refund processed': (r) => r.status === 200,
    });
  }
  
  // Delay between iterations
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'payment-load-test-results.json': JSON.stringify(data),
    'payment-load-test-results.html': htmlReport(data),
  };
}

// Helper to generate text summary
function textSummary(data, options) {
  const { metrics } = data;
  let summary = '\n=== Payment Load Test Results ===\n\n';
  
  // Key metrics
  summary += `Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  summary += `Success Rate: ${(metrics.payment_success_rate?.values?.rate * 100).toFixed(2)}%\n`;
  summary += `Payment Failures: ${metrics.payment_failures?.values?.count || 0}\n`;
  summary += `Average Duration: ${metrics.payment_duration?.values?.avg?.toFixed(0)}ms\n`;
  summary += `P95 Duration: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0)}ms\n`;
  
  // Thresholds
  summary += '\nThreshold Results:\n';
  for (const [key, value] of Object.entries(data.metrics)) {
    if (value.thresholds) {
      const passed = Object.values(value.thresholds).every(t => t.ok);
      summary += `  ${key}: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    }
  }
  
  return summary;
}

// Helper to generate HTML report
function htmlReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Load Test Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { padding: 10px; margin: 10px 0; background: #f0f0f0; }
        .passed { color: green; }
        .failed { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      <h1>Payment Load Test Results</h1>
      <div class="metric">
        <h2>Summary</h2>
        <p>Total Requests: ${data.metrics.http_reqs?.values?.count || 0}</p>
        <p>Success Rate: ${(data.metrics.payment_success_rate?.values?.rate * 100).toFixed(2)}%</p>
        <p>Payment Failures: ${data.metrics.payment_failures?.values?.count || 0}</p>
      </div>
      <div class="metric">
        <h2>Performance</h2>
        <p>Average Duration: ${data.metrics.payment_duration?.values?.avg?.toFixed(0)}ms</p>
        <p>P95 Duration: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(0)}ms</p>
        <p>P99 Duration: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(0)}ms</p>
      </div>
    </body>
    </html>
  `;
}