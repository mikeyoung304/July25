/**
 * End-to-End Order Flow Load Test
 * Tests complete order → payment → kitchen flow with various user roles
 * Validates RBAC enforcement and system stability under load
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const orderFlowDuration = new Trend('order_flow_duration');
const orderFlowSuccess = new Rate('order_flow_success_rate');
const rbacViolations = new Counter('rbac_violations');
const websocketConnections = new Counter('websocket_connections');

// Test configuration
export const options = {
  scenarios: {
    // Simulate different user roles
    managers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'managerFlow',
    },
    servers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 40 },
        { duration: '30s', target: 0 },
      ],
      exec: 'serverFlow',
    },
    cashiers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      exec: 'cashierFlow',
    },
    kitchen: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      exec: 'kitchenFlow',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],  // 95% of requests under 800ms
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    order_flow_success_rate: ['rate>0.90'], // 90% success rate
    rbac_violations: ['count<10'],     // Less than 10 RBAC violations
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';
const RESTAURANT_ID = __ENV.RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

// Test user tokens by role (would be generated from auth in real scenario)
const userTokens = {
  manager: __ENV.MANAGER_TOKEN || 'test-manager-token',
  server: __ENV.SERVER_TOKEN || 'test-server-token',
  cashier: __ENV.CASHIER_TOKEN || 'test-cashier-token',
  kitchen: __ENV.KITCHEN_TOKEN || 'test-kitchen-token',
};

// Sample data
const tables = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const orderTypes = ['dine-in', 'takeout', 'delivery'];

function createOrder(role: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userTokens[role]}`,
    'X-Restaurant-ID': RESTAURANT_ID,
  };

  const orderData = {
    type: randomItem(orderTypes),
    table: randomItem(tables),
    items: [
      {
        menu_item_id: '1',
        name: 'Test Item',
        quantity: Math.floor(Math.random() * 3) + 1,
        price: 10.99,
        modifiers: [],
      },
    ],
    customerName: `${role} Test ${__VU}`,
    notes: `Load test order from ${role}`,
    subtotal: 10.99,
    tax: 0.88,
    tip: 0,
    total_amount: 11.87,
  };

  const response = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify(orderData),
    { headers, tags: { name: `CreateOrder_${role}` } }
  );

  return response;
}

function processPayment(orderId: string, role: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userTokens[role]}`,
    'X-Restaurant-ID': RESTAURANT_ID,
  };

  const paymentData = {
    orderId,
    token: `test-token-${__VU}-${Date.now()}`,
    amount: 11.87,
  };

  const response = http.post(
    `${BASE_URL}/api/v1/payments/create`,
    JSON.stringify(paymentData),
    { headers, tags: { name: `ProcessPayment_${role}` } }
  );

  return response;
}

function updateOrderStatus(orderId: string, status: string, role: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userTokens[role]}`,
    'X-Restaurant-ID': RESTAURANT_ID,
  };

  const response = http.patch(
    `${BASE_URL}/api/v1/orders/${orderId}/status`,
    JSON.stringify({ status }),
    { headers, tags: { name: `UpdateStatus_${role}` } }
  );

  return response;
}

function attemptRefund(paymentId: string, role: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userTokens[role]}`,
    'X-Restaurant-ID': RESTAURANT_ID,
  };

  const response = http.post(
    `${BASE_URL}/api/v1/payments/${paymentId}/refund`,
    JSON.stringify({ reason: 'Test refund' }),
    { headers, tags: { name: `AttemptRefund_${role}` } }
  );

  return response;
}

// Manager flow - full access
export function managerFlow() {
  const flowStart = Date.now();
  
  // Create order
  const orderResponse = createOrder('manager');
  const orderCheck = check(orderResponse, {
    'manager can create order': (r) => r.status === 200 || r.status === 201,
  });
  
  if (!orderCheck) {
    orderFlowSuccess.add(0);
    return;
  }
  
  const order = JSON.parse(orderResponse.body);
  sleep(1);
  
  // Process payment
  const paymentResponse = processPayment(order.id, 'manager');
  const paymentCheck = check(paymentResponse, {
    'manager can process payment': (r) => r.status === 200,
  });
  
  if (!paymentCheck) {
    orderFlowSuccess.add(0);
    return;
  }
  
  const payment = JSON.parse(paymentResponse.body);
  sleep(1);
  
  // Update order status
  updateOrderStatus(order.id, 'preparing', 'manager');
  sleep(1);
  updateOrderStatus(order.id, 'ready', 'manager');
  sleep(1);
  updateOrderStatus(order.id, 'completed', 'manager');
  
  // Attempt refund (managers can refund)
  if (Math.random() < 0.1) { // 10% of orders
    const refundResponse = attemptRefund(payment.paymentId, 'manager');
    check(refundResponse, {
      'manager can process refund': (r) => r.status === 200,
    });
  }
  
  const flowEnd = Date.now();
  orderFlowDuration.add(flowEnd - flowStart);
  orderFlowSuccess.add(1);
  
  sleep(Math.random() * 3 + 2);
}

// Server flow - can create and process payments, no refunds
export function serverFlow() {
  const flowStart = Date.now();
  
  // Create order
  const orderResponse = createOrder('server');
  const orderCheck = check(orderResponse, {
    'server can create order': (r) => r.status === 200 || r.status === 201,
  });
  
  if (!orderCheck) {
    orderFlowSuccess.add(0);
    return;
  }
  
  const order = JSON.parse(orderResponse.body);
  sleep(1);
  
  // Process payment
  const paymentResponse = processPayment(order.id, 'server');
  const paymentCheck = check(paymentResponse, {
    'server can process payment': (r) => r.status === 200,
  });
  
  if (!paymentCheck) {
    orderFlowSuccess.add(0);
    return;
  }
  
  const payment = JSON.parse(paymentResponse.body);
  
  // Attempt refund (should fail - servers can't refund)
  if (Math.random() < 0.05) { // 5% attempt
    const refundResponse = attemptRefund(payment.paymentId, 'server');
    const refundBlocked = check(refundResponse, {
      'server blocked from refund': (r) => r.status === 403,
    });
    
    if (!refundBlocked) {
      rbacViolations.add(1);
      console.error('RBAC VIOLATION: Server was able to process refund!');
    }
  }
  
  const flowEnd = Date.now();
  orderFlowDuration.add(flowEnd - flowStart);
  orderFlowSuccess.add(1);
  
  sleep(Math.random() * 3 + 2);
}

// Cashier flow - can process payments, limited order access
export function cashierFlow() {
  const flowStart = Date.now();
  
  // Cashiers typically don't create orders, but process payments for existing ones
  // For testing, we'll have them attempt to read orders and process payments
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userTokens.cashier}`,
    'X-Restaurant-ID': RESTAURANT_ID,
  };
  
  // Get recent orders
  const ordersResponse = http.get(
    `${BASE_URL}/api/v1/orders?status=pending&limit=10`,
    { headers, tags: { name: 'GetOrders_cashier' } }
  );
  
  const ordersCheck = check(ordersResponse, {
    'cashier can read orders': (r) => r.status === 200,
  });
  
  if (ordersCheck && ordersResponse.body) {
    const orders = JSON.parse(ordersResponse.body);
    if (orders.length > 0) {
      const order = orders[0];
      
      // Process payment for existing order
      const paymentResponse = processPayment(order.id, 'cashier');
      check(paymentResponse, {
        'cashier can process payment': (r) => r.status === 200,
      });
    }
  }
  
  // Attempt to create order (may be blocked depending on config)
  if (Math.random() < 0.1) {
    const orderResponse = createOrder('cashier');
    check(orderResponse, {
      'cashier order creation': (r) => r.status === 200 || r.status === 403,
    });
  }
  
  const flowEnd = Date.now();
  orderFlowDuration.add(flowEnd - flowStart);
  orderFlowSuccess.add(1);
  
  sleep(Math.random() * 5 + 3);
}

// Kitchen flow - WebSocket monitoring and status updates
export function kitchenFlow() {
  const url = `${WS_URL}/ws/kitchen`;
  const params = {
    headers: {
      'Authorization': `Bearer ${userTokens.kitchen}`,
      'X-Restaurant-ID': RESTAURANT_ID,
    },
    tags: { name: 'KitchenWebSocket' },
  };
  
  const response = ws.connect(url, params, function(socket) {
    websocketConnections.add(1);
    
    socket.on('open', () => {
      console.log(`Kitchen display ${__VU} connected`);
      
      // Subscribe to order updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        restaurant_id: RESTAURANT_ID,
      }));
    });
    
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'order_update') {
          // Simulate kitchen updating order status
          if (message.status === 'confirmed' && Math.random() < 0.3) {
            sleep(Math.random() * 5 + 2); // Prep time
            updateOrderStatus(message.order_id, 'preparing', 'kitchen');
          }
          if (message.status === 'preparing' && Math.random() < 0.3) {
            sleep(Math.random() * 10 + 5); // Cook time
            updateOrderStatus(message.order_id, 'ready', 'kitchen');
          }
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    });
    
    socket.on('error', (e) => {
      console.error(`Kitchen WebSocket error: ${e}`);
    });
    
    socket.on('close', () => {
      console.log(`Kitchen display ${__VU} disconnected`);
    });
    
    // Keep connection alive for test duration
    socket.setTimeout(() => {
      socket.close();
    }, 170000); // Close after ~3 minutes
  });
  
  check(response, {
    'kitchen websocket connected': (r) => r && r.status === 101,
  });
}

export function handleSummary(data) {
  const summary = generateSummary(data);
  
  return {
    'stdout': summary.text,
    'order-flow-test-results.json': JSON.stringify(data),
    'order-flow-test-results.html': summary.html,
  };
}

function generateSummary(data) {
  const { metrics } = data;
  
  const textSummary = `
=== Order Flow Load Test Results ===

Overall Performance:
  Total Requests: ${metrics.http_reqs?.values?.count || 0}
  Success Rate: ${(metrics.order_flow_success_rate?.values?.rate * 100).toFixed(2)}%
  Average Flow Duration: ${(metrics.order_flow_duration?.values?.avg / 1000).toFixed(2)}s
  P95 Request Duration: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0)}ms

RBAC Enforcement:
  RBAC Violations: ${metrics.rbac_violations?.values?.count || 0}
  WebSocket Connections: ${metrics.websocket_connections?.values?.count || 0}

Threshold Results:
  Request Duration (p95<800ms): ${metrics.http_req_duration?.thresholds?.['p(95)<800']?.ok ? '✅ PASSED' : '❌ FAILED'}
  Error Rate (<5%): ${metrics.http_req_failed?.thresholds?.['rate<0.05']?.ok ? '✅ PASSED' : '❌ FAILED'}
  Success Rate (>90%): ${metrics.order_flow_success_rate?.thresholds?.['rate>0.90']?.ok ? '✅ PASSED' : '❌ FAILED'}
  RBAC Violations (<10): ${metrics.rbac_violations?.thresholds?.['count<10']?.ok ? '✅ PASSED' : '❌ FAILED'}
`;

  const htmlSummary = `
<!DOCTYPE html>
<html>
<head>
  <title>Order Flow Load Test Results</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      border-left: 4px solid #667eea;
    }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: #333;
    }
    .metric-label {
      color: #666;
      margin-top: 5px;
    }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .warning { color: #ffc107; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #667eea;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:hover {
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Order Flow Load Test Results</h1>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${metrics.http_reqs?.values?.count || 0}</div>
        <div class="metric-label">Total Requests</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${metrics.order_flow_success_rate?.values?.rate > 0.9 ? 'passed' : 'failed'}">
          ${(metrics.order_flow_success_rate?.values?.rate * 100).toFixed(1)}%
        </div>
        <div class="metric-label">Success Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(metrics.order_flow_duration?.values?.avg / 1000).toFixed(2)}s</div>
        <div class="metric-label">Avg Flow Duration</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${metrics.rbac_violations?.values?.count < 10 ? 'passed' : 'failed'}">
          ${metrics.rbac_violations?.values?.count || 0}
        </div>
        <div class="metric-label">RBAC Violations</div>
      </div>
    </div>
    
    <h2>Performance Metrics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
        <th>Target</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>P95 Response Time</td>
        <td>${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0)}ms</td>
        <td>&lt; 800ms</td>
        <td class="${metrics.http_req_duration?.values?.['p(95)'] < 800 ? 'passed' : 'failed'}">
          ${metrics.http_req_duration?.values?.['p(95)'] < 800 ? '✅ PASSED' : '❌ FAILED'}
        </td>
      </tr>
      <tr>
        <td>P99 Response Time</td>
        <td>${metrics.http_req_duration?.values?.['p(99)']?.toFixed(0)}ms</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>Error Rate</td>
        <td>${(metrics.http_req_failed?.values?.rate * 100).toFixed(2)}%</td>
        <td>&lt; 5%</td>
        <td class="${metrics.http_req_failed?.values?.rate < 0.05 ? 'passed' : 'failed'}">
          ${metrics.http_req_failed?.values?.rate < 0.05 ? '✅ PASSED' : '❌ FAILED'}
        </td>
      </tr>
    </table>
    
    <h2>Test Scenarios</h2>
    <p>The test simulated multiple user roles concurrently:</p>
    <ul>
      <li><strong>Managers:</strong> 10 VUs - Full order and payment access with refund capabilities</li>
      <li><strong>Servers:</strong> 40 VUs - Order creation and payment processing</li>
      <li><strong>Cashiers:</strong> 20 VUs - Payment processing and order viewing</li>
      <li><strong>Kitchen:</strong> 5 VUs - WebSocket connections for real-time updates</li>
    </ul>
    
    <p><em>Generated: ${new Date().toISOString()}</em></p>
  </div>
</body>
</html>
`;

  return {
    text: textSummary,
    html: htmlSummary,
  };
}