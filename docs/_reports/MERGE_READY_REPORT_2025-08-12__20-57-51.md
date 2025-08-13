# Merge-Ready Report — 2025-08-12__20-57-51
## Context
- BuildPanel residue: 0 outside _archive/
- Outstanding: P0 client type/casing, P1 server AI test import issues, P2 linter noise
## A) Client casing scan
client/src/services/mockData.ts:9:      restaurant_id: 'rest-1',
client/src/services/mockData.ts:10:      order_number: '001',
client/src/services/mockData.ts:11:      table_number: '5',
client/src/services/mockData.ts:18:      created_at: new Date(Date.now() - 2 * 60000), // 2 minutes ago
client/src/services/mockData.ts:20:      payment_status: 'pending' as const,
client/src/services/mockData.ts:25:      restaurant_id: 'rest-1',
client/src/services/mockData.ts:26:      order_number: '002',
client/src/services/mockData.ts:27:      table_number: 'DT-1',
client/src/services/mockData.ts:33:      created_at: new Date(Date.now() - 8 * 60000), // 8 minutes ago
client/src/services/mockData.ts:35:      payment_status: 'paid' as const,
client/src/services/mockData.ts:41:      restaurant_id: 'rest-1',
client/src/services/mockData.ts:42:      order_number: '003',
client/src/services/mockData.ts:43:      table_number: '7',
client/src/services/mockData.ts:50:      created_at: new Date(Date.now() - 1 * 60000), // 1 minute ago
client/src/services/mockData.ts:52:      payment_status: 'pending' as const,
client/src/services/mockData.ts:57:      restaurant_id: 'rest-1',
client/src/services/mockData.ts:58:      order_number: '004',
client/src/services/mockData.ts:59:      table_number: 'DT-2',
client/src/services/mockData.ts:66:      created_at: new Date(Date.now() - 15 * 60000), // 15 minutes ago
client/src/services/mockData.ts:68:      payment_status: 'paid' as const,
client/src/services/mockData.ts:73:      restaurant_id: 'rest-1',
client/src/services/mockData.ts:74:      order_number: '005',
client/src/services/mockData.ts:75:      table_number: '9',
client/src/services/mockData.ts:82:      created_at: new Date(Date.now() - 10 * 60000), // 10 minutes ago
client/src/services/mockData.ts:84:      payment_status: 'paid' as const,
client/src/services/mockData.ts:89:      restaurant_id: 'rest-1',
client/src/services/mockData.ts:90:      order_number: '006',
client/src/services/mockData.ts:91:      table_number: 'DT-3',
client/src/services/mockData.ts:98:      created_at: new Date(Date.now() - 3 * 60000), // 3 minutes ago
client/src/services/mockData.ts:100:      payment_status: 'paid' as const,
### Client typecheck

> rebuild-6.0@0.0.0 typecheck
> tsc --noEmit

### Client typecheck after fixes

> rebuild-6.0@0.0.0 typecheck
> tsc --noEmit

## B) Server test environment
total 544
drwxr-xr-x@ 20 mikeyoung  staff     640 Aug 12 15:48 .
drwxr-xr-x@ 58 mikeyoung  staff    1856 Aug 12 18:32 ..
-rw-r--r--@  1 mikeyoung  staff   10244 Aug 12 14:58 .DS_Store
-rw-r--r--@  1 mikeyoung  staff    1090 Aug 12 15:48 .env.example
-rw-r--r--@  1 mikeyoung  staff      87 Aug  2 22:26 .env.test
-rw-r--r--@  1 mikeyoung  staff     390 Jul 13 10:24 .gitignore
drwxr-xr-x@  6 mikeyoung  staff     192 Jul 16 13:14 checkpoint
drwxr-xr-x@ 15 mikeyoung  staff     480 Jul 28 23:22 coverage
drwxr-xr-x@ 16 mikeyoung  staff     512 Aug 11 09:48 dist
### Server tests

> grow-fresh-backend@1.0.0 test
> vitest

[33mThe CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.[39m

 RUN  v1.2.0 /Users/mikeyoung/CODING/rebuild-6.0/server

 ❯ tests/order.matching.test.ts  (0 test)
stdout | src/middleware/__tests__/restaurantAccess.test.ts > Restaurant Access Middleware > validateRestaurantAccess > should deny access when user has no access to restaurant
{"error":"No rows found","level":"warn","message":"Restaurant access denied","module":"restaurant-access","requestedRestaurantId":"forbidden-restaurant","timestamp":"2025-08-13T01:06:15.414Z","userId":"user-123"}

 ✓ src/middleware/__tests__/restaurantAccess.test.ts  (9 tests) 4ms
stdout | src/middleware/__tests__/restaurantAccess.test.ts > Restaurant Access Middleware > requireRestaurantRole > should deny users without required role
{"level":"warn","message":"Restaurant role requirement not met","module":"restaurant-access","requiredRoles":["manager","admin"],"timestamp":"2025-08-13T01:06:15.415Z","userId":"user-123","userRole":"staff"}

stdout | src/middleware/__tests__/restaurantAccess.test.ts > Restaurant Access Middleware > requireRestaurantRole > should deny when no restaurant role is set
{"level":"warn","message":"Restaurant role requirement not met","module":"restaurant-access","requiredRoles":["manager"],"timestamp":"2025-08-13T01:06:15.415Z","userId":"user-123"}

 ❯ tests/ai.routes.test.ts  (0 test)
 ✓ src/routes/__tests__/ai.health.test.ts  (4 tests) 15ms
 ❯ src/routes/__tests__/security.test.ts  (16 tests | 7 failed | 2 skipped) 55ms
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Authentication > should reject requests without authentication token
     → expected 400 to be 401 // Object.is equality
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Authentication > should reject requests with expired token
     → expected 'Invalid token' to include 'Token expired'
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Authentication > should accept requests with valid token
     → expected 401 not to be 401 // Object.is equality
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Rate Limiting > should rate limit voice order endpoints
     → expected 0 to be greater than 0
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Rate Limiting > should rate limit transcription endpoints
     → expected 0 to be greater than 0
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Input Validation > should reject invalid order parsing requests
     → expected 401 to be 400 // Object.is equality
   ❯ src/routes/__tests__/security.test.ts > Security Tests > Authorization > should enforce role-based access control
     → expected 'Invalid token' to include 'Insufficient permissions'

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/ai.routes.test.ts [ tests/ai.routes.test.ts ]
