---
status: open
priority: p3
issue_id: "101"
tags: [simplification, dead-code, cleanup]
dependencies: []
created_date: 2025-12-02
source: code-review-simplicity-agent
---

# P3: Remove Unused RequestBatcher

## Problem

`RequestBatcher` is instantiated but never used:

```typescript
// client/src/services/http/httpClient.ts:58
private batcher: RequestBatcher;

// Constructor initializes it:
this.batcher = new RequestBatcher({
  maxBatchSize: 10,
  maxWaitTime: 50,
  batchEndpoint: '/api/v1/batch'
});

// But it's never called anywhere in the class
```

## Investigation Required

1. Check if `/api/v1/batch` endpoint exists on server
2. Check if `RequestBatcher` is used elsewhere
3. Determine if this was planned feature or abandoned code

## Recommended Action

If unused:
```typescript
// Remove from class
// private batcher: RequestBatcher;  // DELETE

// Remove from constructor
// this.batcher = new RequestBatcher({ ... });  // DELETE
```

If planned for future:
- Add TODO comment explaining intent
- Or remove and re-add when needed (YAGNI)

## Files to Check

- `server/src/routes/` - Look for batch endpoint
- `client/src/services/http/RequestBatcher.ts` - Check if exported/used elsewhere

## Impact

- Remove unused dependency initialization
- Reduce memory footprint
- Cleaner codebase

## References

- YAGNI principle
- Related: TODO 100 (cache simplification)
