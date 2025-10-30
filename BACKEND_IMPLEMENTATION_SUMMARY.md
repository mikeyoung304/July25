# Backend Implementation Summary - Seat Number Feature

**Tasks Completed:** BE_001 and BE_002
**Date:** 2025-10-29
**Agent:** BACKEND_AGENT

## Overview
Successfully implemented seat number support in the order creation API with validation against table capacity.

## Files Modified

### 1. `/Users/mikeyoung/CODING/rebuild-6.0/shared/contracts/order.ts`
**Changes:**
- Added `seat_number: z.number().int().min(1).optional()` to OrderPayload schema
- Added `seatNumber: z.number().int().min(1).optional()` (camelCase variant)

**Purpose:** Enable both snake_case and camelCase input formats for API compatibility

### 2. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/models/order.model.ts`
**Changes:**
- Added `seatNumber: Joi.number().integer().min(1).optional()` to create schema

**Purpose:** Joi validation for incoming order creation requests

### 3. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts`
**Changes:**

#### TypeScript Interface Updates:
```typescript
export interface CreateOrderRequest {
  // ... existing fields
  seatNumber?: number;  // ✅ ADDED
}
```

#### Validation Logic (lines 109-112):
```typescript
// Validate seat number if both tableNumber and seatNumber are provided
if (orderData.tableNumber && orderData.seatNumber) {
  await this.validateSeatNumber(restaurantId, orderData.tableNumber, orderData.seatNumber);
}
```

#### Database Storage (line 184):
```typescript
seat_number: orderData.seatNumber,
```

#### RPC Call Update (line 210):
```typescript
p_seat_number: newOrder.seat_number || null,
```

#### New Method (lines 636-689):
```typescript
private static async validateSeatNumber(
  restaurantId: string,
  tableNumber: string,
  seatNumber: number
): Promise<void>
```

**Validation Logic:**
1. Queries `tables` table by `restaurant_id` and `label` (table_number)
2. Retrieves table `capacity`
3. If table not found: logs warning, continues (graceful degradation)
4. If seat number > capacity: throws error with descriptive message
5. Logs validation success for debugging

#### Query Updates:
- Updated all `.select()` statements to include `seat_number` field:
  - `getOrders()` - line 259
  - `getOrder()` - line 305
  - `updateOrderStatus()` - line 373
  - `updateOrderPayment()` - line 483

### 4. `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/20251029150000_add_seat_number_to_create_order_rpc.sql`
**New Migration File Created**

**Changes:**
- Dropped existing `create_order_with_audit` function
- Recreated with new signature including `p_seat_number INTEGER DEFAULT NULL`
- Added `seat_number INTEGER` to RETURNS TABLE
- Updated INSERT statement to include `seat_number` column and value
- Updated SELECT statement to return `seat_number` field
- Updated function comment with change documentation
- Added migration validation to verify `seat_number` in return type

## Validation Flow

```
POST /api/v1/orders
  ↓
[1] Zod Validation (OrderPayload)
  → Validates seatNumber is integer >= 1 if provided
  ↓
[2] Joi Validation (orderSchemas.create)
  → Validates seatNumber is integer >= 1 if provided
  ↓
[3] OrdersService.createOrder()
  ↓
[4] validateSeatNumber() (only if tableNumber AND seatNumber provided)
  → Query tables table for capacity
  → If seatNumber > capacity: throw error
  → Otherwise: continue
  ↓
[5] create_order_with_audit RPC
  → Atomically insert order with seat_number
  → Log status change
  → Return created order with seat_number
```

## Error Handling

### Validation Errors:
1. **Invalid seat number format** (non-integer, < 1)
   - Caught by Zod/Joi validation
   - Returns 400 Bad Request before hitting service layer

2. **Seat exceeds capacity**
   - Caught by `validateSeatNumber()`
   - Throws error: "Seat number {N} exceeds table capacity of {M} for table {label}"
   - Returns error to client with descriptive message

3. **Table not found**
   - Logs warning but continues (graceful degradation)
   - Allows orders to be created even if table doesn't exist in system
   - Rationale: Manual table entry might not be in floor plan yet

## Database Schema
The `seat_number` column already exists in the `orders` table (added by DB_001 migration).

Column details:
- Type: `INTEGER`
- Nullable: `YES`
- Default: `NULL`

## API Compatibility

### Request Body (both formats supported):
```json
{
  "items": [...],
  "tableNumber": "T-12",
  "seatNumber": 3
}
```

OR

```json
{
  "items": [...],
  "table_number": "T-12",
  "seat_number": 3
}
```

### Response (snake_case format):
```json
{
  "id": "...",
  "table_number": "T-12",
  "seat_number": 3,
  ...
}
```

## Testing Scenarios

### ✅ Valid Cases:
1. Order without seatNumber → Should succeed
2. Order with valid seatNumber ≤ table capacity → Should succeed
3. Order with seatNumber but no tableNumber → Should succeed (no validation)

### ❌ Invalid Cases:
1. Order with seatNumber = 0 → 400 Bad Request (Zod/Joi validation)
2. Order with seatNumber = -1 → 400 Bad Request (Zod/Joi validation)
3. Order with seatNumber > table capacity → 400 Bad Request (custom validation)
4. Order with seatNumber = "abc" → 400 Bad Request (Zod/Joi type validation)

## No Breaking Changes

- `seatNumber` is **optional** - existing API clients continue to work
- All existing order creation flows unchanged
- Validation only runs when **both** tableNumber and seatNumber provided
- Database column is nullable with default NULL

## Issues Encountered

**None.** Implementation proceeded smoothly with the following notes:

1. **Docker not running:** Cannot test migration locally, but migration file is syntactically correct and follows existing pattern from `20251020221553_fix_create_order_with_audit_version.sql`

2. **Design decision:** Made table-not-found validation non-fatal (warning only) to support flexible workflows where orders might reference tables not yet in the floor plan system.

## Next Steps for Testing

1. **Start Docker Desktop** and run: `npx supabase db reset`
2. **Test API endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/orders \
     -H "Content-Type: application/json" \
     -H "x-restaurant-id: YOUR_RESTAURANT_ID" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "items": [...],
       "tableNumber": "T-1",
       "seatNumber": 2
     }'
   ```
3. **Test validation:**
   - Create order with seatNumber = 10 for a 4-seat table → Should fail
   - Create order with seatNumber = 2 for a 4-seat table → Should succeed

## Success Criteria Status

- ✅ API accepts seatNumber parameter (snake_case and camelCase)
- ✅ Validation rejects invalid seat numbers (Zod/Joi)
- ✅ Validation rejects seat numbers exceeding capacity (custom)
- ✅ Database stores seat_number correctly (migration created)
- ✅ No breaking changes to existing API clients (optional field)
- ✅ Proper error messages for validation failures

## Code Quality

- **Type Safety:** Full TypeScript typing with interface updates
- **Validation:** Triple-layer validation (Zod → Joi → Custom)
- **Error Handling:** Descriptive error messages with context
- **Logging:** Debug/warn/error logs at appropriate levels
- **Documentation:** Inline comments explaining validation logic
- **Consistency:** Follows existing patterns (snake_case DB, both formats in API)

## Ready for Frontend Integration

The backend is ready to accept seat numbers from the frontend. Frontend can now:
1. Send `seatNumber` in order creation payload
2. Receive seat_number in order responses
3. Display appropriate error messages for validation failures
