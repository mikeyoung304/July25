# TODO-222: Embedding Model Name Hardcoded

**Priority:** P3 (Minor - Maintainability)
**Category:** Code Quality
**Source:** Code Review - Architecture Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The embedding model is hardcoded in the service:

```typescript
// server/src/services/menu-embedding.service.ts
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
```

## Issue

When OpenAI releases new embedding models or dimensions change:
1. Code change required
2. Database migration needed (vector dimension)
3. Re-embedding of all items

## Resolution

Move to configuration:

```typescript
// server/src/config/environment.ts
openai: {
  apiKey: process.env.OPENAI_API_KEY,
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  embeddingDimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536')
}

// Usage
const config = getConfig();
const response = await client.embeddings.create({
  model: config.openai.embeddingModel,
  dimensions: config.openai.embeddingDimensions
});
```

## Files Affected

- `server/src/services/menu-embedding.service.ts`
- `server/src/config/environment.ts`

## Impact

- Minor maintainability concern
- Low priority - current model is stable
