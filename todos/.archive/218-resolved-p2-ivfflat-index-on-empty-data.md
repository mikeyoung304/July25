# TODO-218: IVFFlat Index Created on Empty Data

**Priority:** P2 (Important - Performance)
**Category:** Database / Performance
**Source:** Code Review - Performance Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The migration creates an IVFFlat index before any embeddings exist:

```sql
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
ON menu_items
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Issue with IVFFlat

IVFFlat indexes need to be trained on existing data to create good cluster centroids. When created on empty data:

1. **Poor cluster distribution** - Centroids won't represent actual data
2. **Suboptimal query performance** - Searches may miss relevant results
3. **Needs rebuilding** - Index must be rebuilt after data population

## pgvector Documentation

> "IVFFlat indexes should be created after some data has been inserted. The number of lists should be data-dependent."

## Resolution

### Option 1: Defer Index Creation
```sql
-- In initial migration
ALTER TABLE menu_items ADD COLUMN embedding vector(1536);
-- No index yet

-- In separate migration (after embeddings generated)
CREATE INDEX CONCURRENTLY idx_menu_items_embedding
ON menu_items USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Option 2: Use HNSW Instead
HNSW indexes don't require training:
```sql
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
ON menu_items
USING hnsw (embedding vector_cosine_ops);
```

### Option 3: Add REINDEX Step
```typescript
// After bulk embedding generation
await supabase.rpc('reindex_menu_embeddings');
```

## Files Affected

- `supabase/migrations/20251226_menu_embeddings.sql`

## Verification

After embeddings are generated:
```sql
-- Check index is being used
EXPLAIN ANALYZE
SELECT * FROM find_similar_menu_items(
  '[0.1, 0.2, ...]'::vector(1536),
  'restaurant-uuid',
  10,
  0.5
);
```

## Impact

- Semantic search may return suboptimal results initially
- Performance won't match expectations until reindex
- May cause confusion about search quality
