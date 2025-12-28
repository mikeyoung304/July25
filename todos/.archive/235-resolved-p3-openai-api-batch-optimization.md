# TODO-235: OpenAI API Calls Not Batched Efficiently

**Priority:** P3 (Nice-to-Have - Cost Optimization)
**Category:** Performance / Cost
**Source:** Code Review - Performance Oracle Agent (2025-12-27)
**Commit:** 66773b6d (fix: resolve TODO items from enterprise audit review)

## Problem Statement

The embedding generation makes one OpenAI API call per menu item. OpenAI's embedding API supports batching multiple texts in a single request (up to 2048 inputs), which would reduce API calls by ~95%.

## Findings

### Evidence

```typescript
// Current: 1 API call per item
batch.map(item => this.generateEmbeddingForItem(item))

// Each generateEmbeddingForItem calls:
const response = await client.embeddings.create({
  model: config.openai.embeddingModel,
  input: embeddingText,  // Single text
  dimensions: config.openai.embeddingDimensions
});
```

### Impact

- 20 items per batch = 20 API calls
- Could be 1 API call with batched input
- Reduces API latency and overhead
- Minor cost savings (API calls have overhead)

## Proposed Solutions

### Option 1: Batch Texts in Single API Call
- Modify `generateEmbeddingsForBatch()` to send array of texts
- Parse response to map embeddings back to items
- **Pros:** 95% fewer API calls, faster bulk generation
- **Cons:** Error handling more complex (partial failures)
- **Effort:** Small-Medium
- **Risk:** Low

### Option 2: Accept Current Approach
- Rate limiting already restricts usage
- Simple error handling per item
- **Pros:** No change
- **Cons:** Suboptimal for scale/cost
- **Effort:** None
- **Risk:** Low

## Recommended Action

**Option 1** - Implement batch API calls. The change is straightforward and provides meaningful improvement.

## Technical Details

**Optimized Implementation:**
```typescript
private static async generateEmbeddingsForBatch(
  items: MenuItemForEmbedding[]
): Promise<Array<{ id: string; embedding: number[] } | null>> {
  const texts = items.map(item => this.formatItemForEmbedding(item));

  try {
    const response = await client.embeddings.create({
      model: config.openai.embeddingModel,
      input: texts,  // Array of texts
      dimensions: config.openai.embeddingDimensions
    });

    return response.data.map((embedding, index) => ({
      id: items[index].id,
      embedding: embedding.embedding
    }));
  } catch (error) {
    embeddingLogger.error('Batch embedding failed', { error, count: items.length });
    return items.map(() => null);  // All failed
  }
}
```

## Acceptance Criteria

- [ ] OpenAI API call accepts array of texts
- [ ] Response embeddings mapped correctly to items
- [ ] Error handling for partial/complete failures
- [ ] Unit tests for batch embedding

## Work Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-27 | Created from code review | Identified by Performance agent |
| 2025-12-27 | Triage: APPROVED | Status: pending → ready |

## Resources

- OpenAI Embeddings API: https://platform.openai.com/docs/api-reference/embeddings
