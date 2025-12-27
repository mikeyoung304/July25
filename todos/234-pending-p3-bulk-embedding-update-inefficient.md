# TODO-234: Bulk Embedding Update Uses Individual Queries

**Priority:** P3 (Nice-to-Have - Performance)
**Category:** Performance
**Source:** Code Review - Performance Oracle Agent (2025-12-27)
**Commit:** 66773b6d (fix: resolve TODO items from enterprise audit review)

## Problem Statement

The `generateAllEmbeddings()` method updates embeddings one at a time using `Promise.allSettled()` with individual UPDATE queries. For 500 items, this means 500 separate database operations.

## Findings

### Evidence

```typescript
// server/src/services/menu-embedding.service.ts:387-397
const updateResults = await Promise.allSettled(
  successfulEmbeddings.map(({ id, embedding }) =>
    supabase.from('menu_items').update({
      embedding: `[${embedding.join(',')}]`,
      embedding_updated_at: new Date().toISOString()
    }).eq('id', id)
  )
);
```

### Impact

- 500 items = 500 UPDATE queries
- Increased database connection usage
- Higher latency for bulk operations
- Not utilizing PostgreSQL's batch update capability

## Proposed Solutions

### Option 1: Bulk Upsert via RPC
- Create PostgreSQL function for batch update
- Pass array of (id, embedding) pairs
- **Pros:** Single database round-trip, efficient
- **Cons:** Requires migration, complex SQL
- **Effort:** Medium
- **Risk:** Low

### Option 2: Accept Current Approach
- Rate limiting already restricts to 5 calls/hour
- Batch size is 20 items at a time with delays
- Database load is manageable
- **Pros:** No change needed
- **Cons:** Suboptimal for scale
- **Effort:** None
- **Risk:** Low

## Recommended Action

**Option 2** - Accept current approach for now. The rate limiting and batch delays make this acceptable. Revisit when enabling semantic search at scale.

## Technical Details

**Potential Optimization (for future):**
```sql
CREATE OR REPLACE FUNCTION update_menu_embeddings(
  items jsonb
) RETURNS integer AS $$
  UPDATE menu_items AS m
  SET
    embedding = (i->>'embedding')::vector,
    embedding_updated_at = NOW()
  FROM jsonb_array_elements(items) AS i
  WHERE m.id = (i->>'id')::uuid
$$ LANGUAGE sql;
```

## Acceptance Criteria

- [ ] (Optional) Create bulk update RPC function
- [ ] (Optional) Update generateAllEmbeddings to use batch update

## Work Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-27 | Created from code review | Identified by Performance agent |
| 2025-12-27 | Decision: Defer | Acceptable with rate limiting |

## Resources

- Related: #219 (N+1 query fix - read side was optimized)
