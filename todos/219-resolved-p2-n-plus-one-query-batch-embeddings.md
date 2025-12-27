# TODO-219: N+1 Query Pattern in Batch Embedding Generation

**Priority:** P2 (Important - Performance)
**Category:** Performance / Database
**Source:** Code Review - Performance Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The `generateAllEmbeddings` method exhibits N+1 query pattern:

```typescript
// Step 1: Fetch all items (1 query)
const { data: items } = await query.limit(500);

// Step 2: For EACH item, call generateItemEmbedding (N queries)
const results = await Promise.allSettled(
  batch.map(item => this.generateItemEmbedding(restaurantId, item.id))
);
```

Inside `generateItemEmbedding`:
```typescript
// Fetches the SAME item again with category join
const { data: item } = await supabase
  .from('menu_items')
  .select(`id, name, description, price, dietary_flags, menu_categories!inner(name)`)
  .eq('id', itemId)
  .single();
```

## Impact

For 100 menu items:
- 1 initial query
- 100 individual item fetches (with category join)
- 100 individual update queries
= **201 queries** instead of ~3

## Resolution

Batch the operations:

```typescript
static async generateAllEmbeddings(restaurantId: string, options = {}) {
  // Fetch items WITH category in one query
  const { data: items } = await supabase
    .from('menu_items')
    .select(`
      id, name, description, price, dietary_flags,
      menu_categories!inner(name)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .is('embedding', null)
    .limit(500);

  // Generate embeddings in batches (still need individual OpenAI calls)
  for (const batch of chunks(items, 20)) {
    const embeddings = await Promise.all(
      batch.map(item => this.generateEmbedding(this.formatItemForEmbedding(item)))
    );

    // Batch update
    const updates = batch.map((item, i) => ({
      id: item.id,
      embedding: `[${embeddings[i]?.join(',')}]`,
      embedding_updated_at: new Date().toISOString()
    }));

    // Use upsert for batch update
    await supabase.from('menu_items').upsert(updates);
  }
}
```

## Files Affected

- `server/src/services/menu-embedding.service.ts`

## Verification

```bash
# Enable query logging and run embedding generation
DEBUG=knex:query npm run generate-embeddings
```

## Impact

- Slow embedding generation (minutes vs seconds)
- Database connection saturation
- Timeout risk for large menus
