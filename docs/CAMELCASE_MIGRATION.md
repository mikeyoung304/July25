# CamelCase Migration Guide

## Overview

This guide documents the migration from snake_case to camelCase in the Restaurant OS codebase. This change addresses critical API contract mismatches that have been causing order submission failures.

## The Problem

- **Database**: Uses snake_case (PostgreSQL standard)
- **Client**: Mixed - some components use snake_case, others camelCase
- **Server**: Expects camelCase but has incomplete transformation
- **Result**: Orders fail due to field name mismatches

## The Solution

**Use camelCase everywhere in the application layer**. Snake_case only exists at the database boundary.

## Architecture

```
┌─────────────┐
│   Client    │ ← All camelCase
└──────┬──────┘
       │
       ↓ (camelCase API)
┌─────────────┐
│   Server    │ ← All camelCase
└──────┬──────┘
       │
       ↓ (Transformation Layer)
┌─────────────┐
│  Database   │ ← Snake_case only
└─────────────┘
```

## Implementation Status

### ✅ Completed
- [x] Canonical camelCase types: `shared/types/order.types.canonical.ts`
- [x] DB transformation layer: `server/src/lib/casing.ts`
- [x] Compatibility middleware: `server/src/middleware/normalize-casing.ts`
- [x] ESLint enforcement rules
- [x] Pre-commit validation script: `tools/check-no-snake-case.sh`

### 🚧 In Progress
- [ ] Update all server DTOs to use canonical types
- [ ] Fix client components to use camelCase
- [ ] Update API documentation

## File Structure

### Core Files
- **`shared/types/order.types.canonical.ts`** - Single source of truth for Order types (camelCase)
- **`server/src/lib/casing.ts`** - DB ↔ App transformation functions
- **`server/src/middleware/normalize-casing.ts`** - Temporary compatibility layer

### Validation
- **`tools/check-no-snake-case.sh`** - Pre-commit hook to prevent snake_case
- **`eslint.config.js`** - ESLint rules enforcing camelCase

## Migration Checklist

### For Developers

1. **Import canonical types**:
   ```typescript
   import { Order, OrderItem } from '@/shared/types/order.types.canonical';
   ```

2. **Use camelCase in all new code**:
   ```typescript
   // ❌ Wrong
   order.customer_name
   order.table_number

   // ✅ Correct
   order.customerName
   order.tableNumber
   ```

3. **At DB boundary only**:
   ```typescript
   import { fromDbOrder, toDbOrder } from '@/server/lib/casing';

   // Reading from DB
   const dbRow = await db.query('SELECT * FROM orders...');
   const order = fromDbOrder(dbRow);

   // Writing to DB
   const dbData = toDbOrder(order);
   await db.insert('orders', dbData);
   ```

## Common Field Mappings

| Snake Case (DB) | Camel Case (App) |
|-----------------|------------------|
| customer_name | customerName |
| customer_email | customerEmail |
| customer_phone | customerPhone |
| table_number | tableNumber |
| order_type | type |
| menu_item_id | menuItemId |
| payment_status | paymentStatus |
| payment_method | paymentMethod |
| created_at | createdAt |
| updated_at | updatedAt |
| special_instructions | specialInstructions |
| prep_time_minutes | prepTimeMinutes |

## Deprecation Timeline

### Week 1-2 (Current)
- Compatibility middleware accepts both formats
- Logs warnings for snake_case usage
- All new code must use camelCase

### Week 3-4
- Monitor logs for remaining snake_case usage
- Fix any remaining client code
- Update integration tests

### Week 5+
- Remove compatibility middleware
- Strict camelCase enforcement
- Version bump with breaking change notice

## Testing

### Run validation script:
```bash
./tools/check-no-snake-case.sh
```

### Run ESLint:
```bash
npm run lint
```

### Check transformation:
```bash
npm test -- server/src/lib/casing.test.ts
```

## Monitoring

The compatibility middleware tracks snake_case usage:

```typescript
import { getSnakeCaseStats } from '@/server/middleware/normalize-casing';

// In monitoring endpoint
app.get('/api/metrics/snake-case', (req, res) => {
  res.json(getSnakeCaseStats());
});
```

## Troubleshooting

### TypeScript Errors
If you see errors like:
```
Property 'customer_name' does not exist on type 'Order'
```

**Solution**: Update to use camelCase:
```typescript
order.customerName // not customer_name
```

### API Failures
If orders are failing to submit:

1. Check the network tab for field names
2. Ensure using canonical Order type
3. Verify middleware is applied to the route

### Database Queries
If queries are returning undefined fields:

1. Use column aliases in SQL:
   ```sql
   SELECT customer_name AS "customerName" FROM orders
   ```

2. Or use transformation functions:
   ```typescript
   const orders = rows.map(fromDbOrder);
   ```

## FAQ

**Q: Why not just use snake_case everywhere?**
A: JavaScript/TypeScript ecosystem expects camelCase. Most tools, libraries, and conventions assume it.

**Q: What about external APIs?**
A: Transform at the boundary, just like with the database.

**Q: Can I still use snake_case during development?**
A: The compatibility layer will accept it temporarily, but you'll see warnings. Fix them ASAP.

**Q: What about existing data?**
A: Database schema doesn't change. Only the application layer changes.

## Contact

For questions or issues with the migration:
- Check this guide first
- Review the PR: [#XXX - CamelCase Migration]
- Ask in #dev-help channel

---
*Last updated: 2025-01-17*