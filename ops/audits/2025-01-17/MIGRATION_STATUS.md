# CamelCase Migration Status Report

## 🎯 Goal
Standardize all application code to use camelCase, eliminating API contract mismatches that cause order submission failures.

## ✅ Phase 1: Foundation (COMPLETED)

### What We Built:
1. **Canonical Types** (`shared/types/order.types.canonical.ts`)
   - Single source of truth for Order types
   - All properties in camelCase
   - Separate `OrderDbRow` type for database layer

2. **Transformation Layer** (`server/src/lib/casing.ts`)
   - `fromDbOrder()`: DB → App (snake → camel)
   - `toDbOrder()`: App → DB (camel → snake)
   - Explicit field mappings (no magic)
   - SQL column alias helpers

3. **Compatibility Middleware** (`server/src/middleware/normalize-casing.ts`)
   - Accepts both snake_case and camelCase temporarily
   - Logs warnings with usage metrics
   - Adds deprecation headers
   - 2-4 week migration window

4. **Enforcement Tools**
   - ESLint rule: Enforces camelCase in app code
   - Pre-commit hook: `tools/check-no-snake-case.sh`
   - Exceptions only for DB layer files

5. **Documentation**
   - Migration guide: `docs/CAMELCASE_MIGRATION.md`
   - Executive summary with risk assessment
   - Clear architecture diagram

## 🚧 Phase 2: Migration (NEXT STEPS)

### Immediate Actions Required:

#### 1. Update Server DTOs (2-3 hours)
```typescript
// Update server/src/dto/order.dto.ts to import canonical types
import { CreateOrderDTO, UpdateOrderDTO } from '@/shared/types/order.types.canonical';

// Apply middleware to order routes
app.use('/api/v1/orders', normalizeCasing, orderRoutes);
```

#### 2. Fix Client Components (1-2 hours)
Current snake_case usage in components:
- `client/src/components/kitchen/OrderCard.tsx` (2 occurrences)
- `client/src/components/kitchen/TouchOptimizedOrderCard.tsx` (2 occurrences)
- `client/src/types/filters.ts` (sorting fields)

#### 3. Update Queries (2-3 hours)
Add column aliases to all order queries:
```sql
SELECT
  customer_name AS "customerName",
  table_number AS "tableNumber"
FROM orders
```

## 📊 Current State

### Snake_case Distribution:
- **Shared types**: 104 occurrences (main issue)
- **Client components**: 1 file affected
- **Server DTOs**: Using transformation but not canonical types

### Test Status:
- 19/40 test files failing (unrelated to this change)
- Need to add transformation layer tests

## 🔄 Migration Timeline

### Week 1 (Current)
- [x] Foundation complete
- [ ] Update DTOs
- [ ] Fix components
- [ ] Deploy with compatibility

### Week 2
- [ ] Monitor snake_case usage logs
- [ ] Fix any integration issues
- [ ] Update API documentation

### Week 3-4
- [ ] Verify zero snake_case usage
- [ ] Remove compatibility middleware
- [ ] Version bump (breaking change)

## 🎬 Next Commands to Run

```bash
# 1. Test the validation script
./tools/check-no-snake-case.sh

# 2. Check current violations
npm run lint 2>&1 | grep naming-convention

# 3. Run a build to catch TypeScript issues
npm run build

# 4. Test transformation functions
npm test -- server/src/lib/casing.test.ts
```

## 🚨 Risk Mitigation

1. **Compatibility Period**: 2-4 weeks with both formats accepted
2. **Logging**: Track all snake_case usage
3. **Gradual Rollout**: Can deploy foundation without breaking changes
4. **Rollback Plan**: Remove middleware to restore old behavior

## 📈 Success Metrics

- [ ] Zero snake_case warnings in logs
- [ ] All TypeScript errors resolved
- [ ] Order submission success rate 100%
- [ ] API response time unchanged

---
*Generated: 2025-01-17*
*Branch: fix/api-contract-alignment*
*Commit: f8fa032*