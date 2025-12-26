# TODO-216: RAG Implementation is Premature Optimization

**Priority:** P2 (Important - Technical Debt)
**Category:** Architecture / YAGNI
**Source:** Code Review - DHH Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The Menu RAG (Retrieval Augmented Generation) implementation adds significant complexity for a feature with no proven user need:

1. **No users yet** - Voice ordering is not in production use
2. **Simple ilike works** - Current text search handles most cases
3. **Operational overhead** - Embeddings need generation, storage, and maintenance
4. **Cost** - OpenAI embedding API calls for every menu item update

## Added Complexity

- `menu-embedding.service.ts` (392 lines)
- `20251226_menu_embeddings.sql` migration
- pgvector extension dependency
- Embedding generation batch jobs
- Storage for 1536-dimension vectors per item

## YAGNI Principle

"You Aren't Gonna Need It" - Build features when you need them, not in anticipation.

Current voice ordering works with:
```typescript
.ilike('name', `%${query}%`)
```

Add semantic search when:
1. User feedback indicates search quality issues
2. Metrics show failed menu lookups
3. Product decision to enhance voice UX

## Resolution Options

### Option 1: Revert RAG (Recommended)
- Remove embedding service and migration
- Keep code in a feature branch for future

### Option 2: Feature Flag
```typescript
if (config.features.semanticSearch) {
  // Use RAG
} else {
  // Use ilike
}
```

### Option 3: Accept and Monitor
- Deploy as-is
- Track usage metrics
- Remove if unused after 90 days

## Files Affected

- `server/src/services/menu-embedding.service.ts`
- `supabase/migrations/20251226_menu_embeddings.sql`
- `server/src/ai/functions/realtime-menu-tools.ts`

## Impact

- Increased maintenance burden
- Higher operational costs
- Complexity without proven value
