/**
 * Payment Processing Load Test
 *
 * Tests payment processing capacity with concurrent users against Stripe.
 * Target: 100 concurrent users, <500ms p95 response time, >99% success rate
 *
 * Resurrected from: scripts/archive/2025-09-25/load-test/payment-load-test.ts
 * Updated for:
 * - Stripe migration (from Square)
 * - ADR-001 snake_case convention
 * - Current API endpoint structure
 *
 * Usage:
 *   k6 run tests/load/payment-processing.k6.js
 *   k6 run --env BASE_URL=https://staging-api.example.com tests/load/payment-processing.k6.js
 *
 * Environment Variables:
 *   BASE_URL       - API base URL (default: http://localhost:3001)
 *   AUTH_TOKEN     - JWT token for authentication
 *   RESTAURANT_ID  - Restaurant ID for multi-tenancy
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const paymentDuration = new Trend('payment_duration_ms');
const paymentSuccess = new Rate('payment_success_rate');
const paymentFailures = new Counter('payment_failures');
const orderCreationFailures = new Counter('order_creation_failures');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Warm up to 20 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '7m', target: 100 },  // Stay at 100 users (peak load)
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.01'],                  // Error rate under 1%
    'payment_success_rate': ['rate>0.99'],             // Payment success rate over 99%
    'payment_duration_ms': ['p(95)<500', 'p(99)<1000'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const RESTAURANT_ID = __ENV.RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

// Sample menu items for order creation (snake_case per ADR-001)
const menuItems = [
  { id: '1', name: 'Classic Burger', price: 12.99, category: 'mains' },
  { id: '2', name: 'Margherita Pizza', price: 15.99, category: 'mains' },
  { id: '3', name: 'Caesar Salad', price: 8.99, category: 'salads' },
  { id: '4', name: 'Truffle Fries', price: 4.99, category: 'sides' },
  { id: '5', name: 'Craft Soda', price: 2.99, category: 'drinks' },
];

// Stripe test payment method IDs
// See: https://stripe.com/docs/testing
const stripeTestPaymentMethods = [
  'pm_card_visa',           // Visa
  'pm_card_mastercard',     // Mastercard
  'pm_card_amex',           // American Express
  'pm_card_discover',       // Discover
];

/**
 * Generate a random order with snake_case fields (ADR-001)
 */
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
  const tax = subtotal * 0.0825; // 8.25% tax rate
  const total = subtotal + tax;

  // All fields in snake_case per ADR-001
  return {
    type: 'online',
    items,
    customer_name: `LoadTest User ${__VU}`,
    customer_email: `loadtest${__VU}@example.com`,
    customer_phone: '5551234567',
    notes: 'Load test order',
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    tip: 0,
    total_amount: Math.round(total * 100) / 100,
  };
}

/**
 * Main test function - executes one iteration per virtual user
 */
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
    'order has id': (r) => {
      try {
        return JSON.parse(r.body).id !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!orderSuccess) {
    orderCreationFailures.add(1);
    paymentFailures.add(1);
    console.error(`Order creation failed: ${orderResponse.status} - ${orderResponse.body}`);
    return;
  }

  const order = JSON.parse(orderResponse.body);

  // Small delay between order and payment (simulating user entering card)
  sleep(Math.random() * 2 + 1); // 1-3 seconds

  // Step 2: Process payment via Stripe
  // Payment payload uses snake_case per ADR-001
  const paymentPayload = {
    order_id: order.id,
    token: randomItem(stripeTestPaymentMethods), // Stripe test payment method
    amount: order.total_amount || orderPayload.total_amount,
    // Note: idempotency_key is generated server-side per payment.service.ts
    // We include a client hint but server will generate its own
    idempotency_key: `load-test-${__VU}-${__ITER}-${Date.now()}`,
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
    'payment processed (200)': (r) => r.status === 200,
    'payment successful': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    'has payment_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        // Response may use payment_id or paymentId
        return body.payment_id !== undefined || body.paymentId !== undefined || body.payment?.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (paymentCheck) {
    paymentSuccess.add(1);
  } else {
    paymentSuccess.add(0);
    paymentFailures.add(1);
    console.error(`Payment failed for order ${order.id}: ${paymentResponse.status} - ${paymentResponse.body}`);
  }

  // Optional: Test payment status check (10% of successful payments)
  if (paymentCheck && Math.random() < 0.1) {
    try {
      const payment = JSON.parse(paymentResponse.body);
      const paymentId = payment.payment_id || payment.paymentId || payment.payment?.id;

      if (paymentId) {
        sleep(1);

        const statusResponse = http.get(
          `${BASE_URL}/api/v1/payments/${paymentId}`,
          { headers, tags: { name: 'CheckPaymentStatus' } }
        );

        check(statusResponse, {
          'status check successful': (r) => r.status === 200,
        });
      }
    } catch (e) {
      // Ignore errors in optional status check
    }
  }

  // Optional: Test refund (1% of successful payments)
  if (paymentCheck && Math.random() < 0.01) {
    try {
      const payment = JSON.parse(paymentResponse.body);
      const paymentId = payment.payment_id || payment.paymentId || payment.payment?.id;

      if (paymentId) {
        sleep(2);

        const refundPayload = {
          reason: 'Load test refund',
        };

        const refundResponse = http.post(
          `${BASE_URL}/api/v1/payments/${paymentId}/refund`,
          JSON.stringify(refundPayload),
          { headers, tags: { name: 'ProcessRefund' } }
        );

        check(refundResponse, {
          'refund processed': (r) => r.status === 200,
        });
      }
    } catch (e) {
      // Ignore errors in optional refund test
    }
  }

  // Delay between iterations (realistic user think time)
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

/**
 * Summary handler - generates reports after test completion
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'k6-results.json': JSON.stringify(data, null, 2),
  };
}

/**
 * Generate text summary of results
 */
function textSummary(data) {
  const { metrics } = data;
  let summary = '\n╔════════════════════════════════════════════════════════════╗\n';
  summary +=     '║        Payment Load Test Results - Stripe                  ║\n';
  summary +=     '╚════════════════════════════════════════════════════════════╝\n\n';

  // Key metrics
  summary += '📊 Key Metrics:\n';
  summary += `   Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  summary += `   Payment Success Rate: ${((metrics.payment_success_rate?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `   Payment Failures: ${metrics.payment_failures?.values?.count || 0}\n`;
  summary += `   Order Creation Failures: ${metrics.order_creation_failures?.values?.count || 0}\n\n`;

  // Performance
  summary += '⚡ Performance:\n';
  summary += `   Average Duration: ${(metrics.payment_duration_ms?.values?.avg || 0).toFixed(0)}ms\n`;
  summary += `   P95 Duration: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms\n`;
  summary += `   P99 Duration: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(0)}ms\n\n`;

  // Thresholds
  summary += '🎯 Threshold Results:\n';
  let allPassed = true;
  for (const [key, value] of Object.entries(data.metrics)) {
    if (value.thresholds) {
      for (const [threshold, result] of Object.entries(value.thresholds)) {
        const passed = result.ok;
        if (!passed) allPassed = false;
        summary += `   ${passed ? '✅' : '❌'} ${key} ${threshold}: ${passed ? 'PASSED' : 'FAILED'}\n`;
      }
    }
  }

  summary += '\n';
  summary += allPassed ? '✅ All thresholds passed!\n' : '❌ Some thresholds failed!\n';

  return summary;
}
