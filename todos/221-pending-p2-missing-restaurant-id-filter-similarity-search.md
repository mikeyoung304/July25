# TODO-221: Restaurant ID Validation Missing in Similarity Search

**Priority:** P2 (Important - Multi-Tenancy Security)
**Category:** Security / Multi-Tenancy
**Source:** Code Review - Security Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

While the `find_similar_menu_items` function filters by `restaurant_id`, the calling code in `findSimilarItems` doesn't validate that the restaurantId is valid or that the caller has access to it:

```typescript
static async findSimilarItems(
  query: string,
  restaurantId: string,  // No validation
  options = {}
): Promise<SimilarMenuItem[]> {
  const queryEmbedding = await this.generateEmbedding(query);

  // Directly uses restaurantId without validation
  const { data } = await supabase.rpc('find_similar_menu_items', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    target_restaurant_id: restaurantId,  // Could be any UUID
    ...
  });
}
```

## Risk

1. **Cross-tenant data access** - If called with wrong restaurantId
2. **Enumeration attack** - Guessing restaurant UUIDs to find menus
3. **RLS bypass** - Service key bypasses row-level security

## Resolution

### Option 1: Validate restaurant access
```typescript
static async findSimilarItems(
  query: string,
  restaurantId: string,
  userId: string,  // Add user context
  options = {}
) {
  // Verify user has access to restaurant
  const hasAccess = await validateRestaurantAccess(userId, restaurantId);
  if (!hasAccess) {
    throw new ForbiddenError('No access to restaurant');
  }
  // ... continue with search
}
```

### Option 2: Use user-scoped client
```typescript
// Instead of service key client
const userSupabase = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${userToken}` }}
});
// RLS will enforce restaurant access
```

### Option 3: Add restaurant validation
```typescript
// Verify restaurant exists and is accessible
const { data: restaurant } = await supabase
  .from('restaurants')
  .select('id')
  .eq('id', restaurantId)
  .single();

if (!restaurant) {
  throw new NotFoundError('Restaurant not found');
}
```

## Files Affected

- `server/src/services/menu-embedding.service.ts`
- `server/src/ai/functions/realtime-menu-tools.ts`

## Impact

- Potential cross-tenant data leakage
- Audit/compliance concerns
- Trust boundary violation
