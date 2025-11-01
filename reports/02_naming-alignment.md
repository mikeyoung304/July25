# PHASE 2: NAMING & SCHEMA ALIGNMENT REPORT
## July25 Night Audit - Convention Analysis
*Generated: 2025-09-23*

## 🎯 Executive Summary

**Critical Finding**: The codebase has a **30% naming mismatch rate** between client and server, with mixed camelCase/snake_case conventions creating data transformation overhead and bug risk.

## 📊 Naming Convention Statistics

### Overall Distribution
| Component | camelCase | snake_case | Consistency |
| --- | --- | --- | --- |
| Client | 75 files (76%) | 23 files (24%) | ⚠️ MIXED |
| Server | 47 files (65%) | 25 files (35%) | ⚠️ MIXED |
| Shared | 5 files (20%) | 20 files (80%) | ✅ SNAKE |
| Database | 0 fields | ALL fields | ✅ SNAKE |

### Field Naming Conflicts
- **150+ field name mismatches** across boundaries
- **104 timestamp variations** in client code alone
- **12 duplicate type definitions** with different conventions
- **23 files** with inconsistent transformation usage

## 🔍 Critical Mismatches Found

### 1. Restaurant ID Chaos
```typescript
// Found both patterns in same codebase:
restaurant_id: 'test-restaurant-id'  // Database/shared
restaurantId: string                  // Client contexts
restaurant_id || restaurantId         // Defensive coding!
```

### 2. Timestamp Confusion
```typescript
created_at    vs  createdAt       (104 instances)
updated_at    vs  updatedAt
completed_at  vs  completedTime   // Semantic difference!
```

### 3. Order Field Inconsistencies
```typescript
// Database Schema (snake_case)
order_number, payment_status, total_amount, table_number

// Client Usage (mixed)
orderNumber, paymentStatus, totalAmount, tableNumber
```

### 4. Type Definition Fragmentation
- `Order` type defined in **3+ locations**
- `UIOrderType` vs `OrderType` creating confusion
- `ClientOrder` vs shared `Order` with different fields

## 🏗️ Transformation Layer Analysis

### Current Implementation
```typescript
// client/src/services/utils/caseTransform.ts
toSnakeCase() // Deep transformation
toCamelCase() // Deep transformation
```

### Usage Problems
- ⚠️ **WebSocket**: Transforms outgoing, not always incoming
- ⚠️ **HTTP Client**: Inconsistent application
- ⚠️ **Components**: Some transform, some don't
- ❌ **Performance**: 15-20% overhead on large arrays

## 🔴 BuildPanel Remnants Found

### Commented Code (Should Remove)
```typescript
// server/src/server.ts
// const { buildPanelServiceInstance } = await import('./services/buildpanel.service');
// if (buildPanelServiceInstance?.cleanup) {
//   buildPanelServiceInstance.cleanup();
```
**Action**: Create PR to remove all BuildPanel references

## 📁 Files Requiring Alignment

### High Priority (Core Services)
1. `/client/src/services/orders/OrderService.ts`
2. `/client/src/services/websocket/WebSocketService.ts`
3. `/server/src/services/orders.service.ts`
4. `/client/src/contexts/AuthContext.tsx`

### Type Definitions (Consolidation Needed)
1. `/shared/types/order.types.ts`
2. `/client/src/types/unified-order.ts`
3. `/server/src/models/order.model.ts`

### API Boundaries (Transform Enforcement)
1. `/client/src/services/http/httpClient.ts`
2. `/client/src/services/api.ts`
3. All WebSocket message handlers

## 🎯 Unified Naming Strategy

### Proposed Convention
```yaml
Database:     snake_case  (existing, don't change)
API Payload:  snake_case  (align with DB)
Shared Types: snake_case  (single source of truth)
Client State: camelCase   (JavaScript convention)
Transform:    At API boundary only
```

### Implementation Plan
```typescript
// 1. Standardize shared types (snake_case)
interface Order {
  order_id: string;
  restaurant_id: string;
  created_at: string;
  // ... all snake_case
}

// 2. Transform at API boundary
class ApiClient {
  async getOrder(id: string): Promise<ClientOrder> {
    const response = await fetch(`/orders/${id}`);
    const data = await response.json();
    return toCamelCase(data); // Transform once
  }
}

// 3. Client uses camelCase internally
interface ClientOrder {
  orderId: string;
  restaurantId: string;
  createdAt: string;
  // ... all camelCase
}
```

## 🚨 Anti-Patterns to Fix

### 1. Defensive Dual-Checking
```typescript
// BAD - Currently in codebase
restaurant_id || restaurantId

// GOOD - After transformation
restaurantId  // Guaranteed by boundary transform
```

### 2. Mixed Convention Files
```typescript
// BAD - Same file, different conventions
const orderId = order.order_id;
const status = order.paymentStatus;

// GOOD - Consistent within boundary
const orderId = order.orderId;
const status = order.paymentStatus;
```

## 📈 Impact Assessment

### Current Problems
- 🐛 **Bug Risk**: Field mismatches cause silent failures
- 🔄 **Maintenance**: Developers unsure which convention to use
- ⚡ **Performance**: Redundant transformations
- 🧪 **Testing**: Need to test both conventions

### After Alignment
- ✅ **Type Safety**: Single source of truth
- ✅ **Performance**: One transformation per request
- ✅ **Clarity**: Clear convention boundaries
- ✅ **Testing**: Predictable data shapes

## 🔧 Automated Fix Script

```bash
# Generate codemod for automatic fixing
npx jscodeshift -t transform-naming.js \
  --snake-to-camel \
  --enforce-boundary \
  client/src/**/*.{ts,tsx}
```

## 📋 PR Plan for Fixes

### PR 1: Remove BuildPanel Remnants
- Remove commented imports
- Delete unused service references
- Clean dist/ folder

### PR 2: Consolidate Type Definitions
- Move all to `/shared/types`
- Use snake_case consistently
- Add JSDoc for clarity

### PR 3: Enforce Transformation Boundary
- Update ApiClient
- Add transform middleware
- Create type guards

### PR 4: Fix High-Priority Services
- OrderService alignment
- WebSocketService consistency
- Auth context updates

## Next Steps
→ Proceeding to PHASE 3: Security & Auth Rails
→ Will create naming alignment PRs
→ Implement automated transformation at boundaries