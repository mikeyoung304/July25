# TODO-220: Missing LIMIT on getScheduledOrders Query

**Priority:** P2 (Important - Performance)
**Category:** Performance / Database
**Source:** Code Review - Performance Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

While `scheduledOrders.service.ts` was updated with LIMIT for general queries, the `getScheduledOrders` function may still be missing limits in certain code paths:

```typescript
// Potential unbounded query
const { data } = await supabase
  .from('scheduled_orders')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .gte('scheduled_date', startDate)
  .lte('scheduled_date', endDate);
```

## Risk

A restaurant with years of historical data could return thousands of records in a single query, causing:
- Memory exhaustion
- Slow response times
- Database connection timeout

## Resolution

Add LIMIT with pagination:

```typescript
const PAGE_SIZE = 100;

async function getScheduledOrders(
  restaurantId: string,
  startDate: string,
  endDate: string,
  page = 1
) {
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from('scheduled_orders')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  return {
    data,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: count,
      totalPages: Math.ceil((count || 0) / PAGE_SIZE)
    }
  };
}
```

## Files Affected

- `server/src/services/scheduledOrders.service.ts`

## Verification

```bash
# Check for unbounded queries
grep -n "\.select(" server/src/services/scheduledOrders.service.ts | grep -v "limit\|range"
```

## Impact

- API can become slow with historical data
- Memory issues on data-heavy restaurants
- Poor UX with long load times
