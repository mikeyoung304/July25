# TODO-224: Magic Numbers in Embedding Service

**Priority:** P3 (Minor - Code Quality)
**Category:** Code Quality
**Source:** Code Review - Code Simplicity Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

Several magic numbers in the embedding service:

```typescript
// Unexplained constants
const { batchSize = 20 } = options;           // Why 20?
const { limit = 10, threshold = 0.5 } = options;  // Why 0.5?
await new Promise(resolve => setTimeout(resolve, 1000));  // Why 1 second?
.limit(500);  // Why 500?
```

## Resolution

Add named constants with documentation:

```typescript
// Batch size for OpenAI API calls - balances throughput vs rate limits
const EMBEDDING_BATCH_SIZE = 20;

// OpenAI rate limit: 3000 RPM for text-embedding-3-small
const RATE_LIMIT_DELAY_MS = 1000;

// Default similarity threshold - lower values return more results
// 0.5 = 50% similarity, good balance for menu matching
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

// Maximum items to process in single operation
// Prevents timeout and memory issues
const MAX_ITEMS_PER_RUN = 500;
```

## Files Affected

- `server/src/services/menu-embedding.service.ts`

## Impact

- Minor readability improvement
- Self-documenting code
- Easier to tune parameters
