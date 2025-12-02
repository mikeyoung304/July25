---
status: open
priority: p3
issue_id: "102"
tags: [performance, health-check, monitoring]
dependencies: []
created_date: 2025-12-02
source: code-review-performance-agent
---

# P3: Health Check DB Query Too Heavy

## Problem

The detailed health check queries the `restaurants` table:

```typescript
// server/src/routes/metrics.ts:140-153
const start = Date.now();
const { error } = await supabase.from('restaurants').select('id').limit(1);
dbLatency = Date.now() - start;
```

## Issues

1. **Table selection:** `restaurants` may not be optimal for health checks
2. **Query overhead:** Even with `limit(1)`, still involves table scan planning
3. **Frequency impact:** If health checks are frequent (e.g., every 10s), adds load

## Recommended Improvements

**Option A: Use dedicated health table**
```sql
CREATE TABLE health_check (
  id int PRIMARY KEY DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO health_check VALUES (1);
```

```typescript
const { error } = await supabase.from('health_check').select('id').single();
```

**Option B: Use raw SQL ping**
```typescript
const { error } = await supabase.rpc('ping');  // Returns 'pong'
```

**Option C: Use connection pool status**
```typescript
// If using pg pool directly
const healthy = pool.totalCount > 0 && pool.idleCount > 0;
```

## Current Mitigation

The 1000ms degraded threshold is reasonable - this isn't critical, just a nice-to-have optimization.

## Files to Modify

- `server/src/routes/metrics.ts` - Optimize health query
- `supabase/migrations/` - Add health_check table (if Option A)

## References

- Best practice: Lightweight health checks
- Related: Monitoring/alerting setup
