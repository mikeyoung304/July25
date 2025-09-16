# DTO Mismatches & Ad-hoc Casing Issues

## CRITICAL MISMATCHES

### 1. Order Items Structure Mismatch
**Location**: Multiple client components
**Issue**: Client sends different item structure than server expects

#### Client Sends (varies by component):
```javascript
// From UnifiedCartContext.tsx:71
{
  menuItemId: item.menuItemId || item.menuItem?.id || item.menu_item_id,
  // ... other fields
}

// From OrderService.ts:230-233
{
  id: item.id || item.menu_item_id,
  // ... other fields
}
```

#### Server Expects (order.dto.ts:14-21):
```typescript
{
  id: string,           // Menu item ID
  name: string,
  quantity: number,
  price: number,
  modifiers: Array<{name: string, price?: number}>,
  notes?: string
}
```

**Impact**: Order submission may fail due to missing required `id` field

### 2. Mixed Snake/Camel Case in Client Components
**Location**: Kitchen display components
**Issue**: Components directly access snake_case fields from API responses

```typescript
// OrderCard.tsx:102-106
order.customer_name   // Should be: order.customerName
order.table_number    // Should be: order.tableNumber

// TouchOptimizedOrderCard.tsx:153,184,187
order.table_number    // Should be: order.tableNumber
order.customer_name   // Should be: order.customerName
```

**Impact**: Runtime errors if server starts returning camelCase

### 3. Order Type Enum Mismatch
**Location**: Client vs Server order types

#### Client UI Types:
```javascript
'dine-in' | 'takeout' | 'delivery' | 'online' | 'drive-thru' | 'kiosk' | 'voice'
```

#### Server Database Types:
```javascript
'online' | 'pickup' | 'delivery'
```

#### DTO Accepted Types (order.dto.ts:35):
```javascript
'dine-in' | 'takeout' | 'delivery' | 'pickup' | 'kiosk' | 'voice'
```

**Impact**: Order type mapping inconsistencies

## AD-HOC CASING VIOLATIONS

### 1. OrderService.ts Manual Field Mapping
```typescript
// Line 41
params.table_number = filters.tableNumber  // Should use transform utility

// Line 200
table_number: orderData.table_number || '1'  // Mixed casing

// Line 280-284
table_number: '1',
items: [{
  menu_item_id: '1',  // Should be 'id' per DTO
}]
```

### 2. Test Utils Using Snake Case
**Location**: client/src/test-utils/index.tsx:29-50
```typescript
{
  customer_name: 'John Doe',     // Should be customerName
  menu_item_id: '101',           // Should be id
  table_number: '5',             // Should be tableNumber
}
```

### 3. Supabase Type Definition
**Location**: client/src/core/supabase.ts:35
```typescript
total_amount: number  // Database field exposed in client types
```

## LEGACY FIELD USAGE

### Fields Still Being Sent by Client
Despite server-side transformation support, client still sends:
- `customer_name` instead of `customerName`
- `table_number` instead of `tableNumber`
- `order_type` instead of `type`
- `menu_item_id` instead of `id`
- `total_amount` instead of `total`
- `special_instructions` instead of `notes`
- `modifications` instead of `modifiers`

**Evidence**: Server logs warnings in dev mode (order.dto.ts:75)

## WEBSOCKET VS HTTP INCONSISTENCY

### WebSocket Service
- **Outbound**: Applies `toSnakeCase()` transform
- **Location**: WebSocketService.ts:174

### HTTP Requests
- **Outbound**: Sends raw camelCase (no transform)
- **Location**: useApiRequest.ts, httpClient.ts

**Impact**: Backend must handle both formats

## RECOMMENDATIONS

### Immediate Actions
1. **Standardize Item ID Field**: Always use `id`, not `menuItemId` or `menu_item_id`
2. **Fix Kitchen Components**: Transform snake_case responses to camelCase
3. **Unify Order Types**: Create single source of truth for order type enums

### Medium-term Fixes
1. **Remove Legacy Transforms**: Update all client code to use camelCase
2. **Consistent Boundaries**: Apply transforms at network layer only
3. **Type Generation**: Generate client types from server DTOs

### Long-term Solution
1. **GraphQL/tRPC**: Use schema-first approach with automatic type safety
2. **API Versioning**: Deprecate snake_case endpoints gradually
3. **Contract Testing**: Validate API contracts in CI/CD pipeline

## Files Requiring Updates

### High Priority (Breaking Issues)
1. client/src/contexts/UnifiedCartContext.tsx:71
2. client/src/services/orders/OrderService.ts:41,200,230-233,280-284
3. client/src/components/kitchen/OrderCard.tsx:102-106
4. client/src/components/kitchen/TouchOptimizedOrderCard.tsx:153,184,187

### Medium Priority (Code Quality)
1. client/src/test-utils/index.tsx:29-50
2. client/src/services/orders/OrderHistoryService.ts:37-48
3. client/src/services/realtime/orderSubscription.ts:147,152

### Low Priority (Working but Inconsistent)
1. server/src/dto/order.dto.ts:51-116 (remove after client update)
2. client/src/core/supabase.ts:35 (type definitions)